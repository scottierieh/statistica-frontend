
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, HeartPulse, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '../ui/tabs';
import { Badge } from '../ui/badge';

interface SurvivalAnalysisPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function SurvivalAnalysisPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: SurvivalAnalysisPageProps) {
    const { toast } = useToast();
    const [durationCol, setDurationCol] = useState<string | undefined>();
    const [eventCol, setEventCol] = useState<string | undefined>();
    const [groupCol, setGroupCol] = useState<string | undefined>();
    const [covariates, setCovariates] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1 && categoricalHeaders.length > 0, [data, numericHeaders, categoricalHeaders]);
    
    const availableCovariates = useMemo(() => {
        const excluded = new Set([durationCol, eventCol, groupCol]);
        return [...numericHeaders, ...categoricalHeaders].filter(h => !excluded.has(h));
    }, [numericHeaders, categoricalHeaders, durationCol, eventCol, groupCol]);

    useEffect(() => {
        setDurationCol(numericHeaders.find(h => h.toLowerCase().includes('tenure') || h.toLowerCase().includes('time')));
        setEventCol(allHeaders.find(h => h.toLowerCase().includes('churn') || h.toLowerCase().includes('event')));
        setGroupCol(categoricalHeaders[0]);
        setAnalysisResult(null);
    }, [data, numericHeaders, categoricalHeaders]);
    
    const allHeaders = useMemo(() => [...numericHeaders, ...categoricalHeaders], [numericHeaders, categoricalHeaders]);

    const handleCovariateChange = (header: string, checked: boolean) => {
        setCovariates(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!durationCol || !eventCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both duration and event columns.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/survival', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, durationCol, eventCol, groupCol, covariates })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Survival Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, durationCol, eventCol, groupCol, covariates, toast]);
    
    if (!canRun) {
        const survivalExample = exampleDatasets.find(ex => ex.id === 'survival-churn');
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Survival Analysis</CardTitle>
                        <CardDescription>
                           To perform survival analysis, you need data with duration, event status, and optionally grouping variables.
                        </CardDescription>
                    </CardHeader>
                    {survivalExample && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(survivalExample)}>Load Sample Churn Data</Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        )
    }

    const results = analysisResult?.results;
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Survival Analysis Setup</CardTitle>
                    <CardDescription>Configure the variables for Kaplan-Meier and Cox regression analysis.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><Label>Duration</Label><Select value={durationCol} onValueChange={setDurationCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Event</Label><Select value={eventCol} onValueChange={setEventCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Group (Optional)</Label><Select value={groupCol} onValueChange={v => setGroupCol(v === 'none' ? undefined : v)}><SelectTrigger><SelectValue placeholder="None"/></SelectTrigger><SelectContent><SelectItem value="none">None</SelectItem>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div>
                        <Label>Covariates (for Cox PH)</Label>
                        <ScrollArea className="h-24 border rounded-md p-2">
                           {availableCovariates.map(h => (
                                <div key={h} className="flex items-center space-x-2">
                                    <Checkbox id={`cov-${h}`} checked={covariates.includes(h)} onCheckedChange={(c) => handleCovariateChange(h, c as boolean)} />
                                    <Label htmlFor={`cov-${h}`}>{h}</Label>
                                </div>
                            ))}
                        </ScrollArea>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !durationCol || !eventCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && (
                 <div className="space-y-4">
                    {analysisResult.plot && (
                         <Card>
                            <CardHeader><CardTitle className="font-headline">Analysis Overview</CardTitle></CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="Survival Analysis Plots" width={1400} height={1000} className="w-full rounded-md border" />
                            </CardContent>
                        </Card>
                    )}
                     <Tabs defaultValue="kaplan_meier" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="kaplan_meier">Kaplan-Meier</TabsTrigger>
                            <TabsTrigger value="cox_ph" disabled={!results.cox_ph}>Cox Regression</TabsTrigger>
                            <TabsTrigger value="aft" disabled={!results.aft_weibull}>AFT Model</TabsTrigger>
                        </TabsList>
                        <TabsContent value="kaplan_meier" className="mt-4">
                             <div className="grid lg:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader><CardTitle>Overall Survival</CardTitle></CardHeader>
                                    <CardContent>
                                        <p>Median Survival Time: <Badge>{results.kaplan_meier.median_survival_time?.toFixed(2) ?? 'N/A'}</Badge></p>
                                    </CardContent>
                                </Card>
                                {results.log_rank_test && (
                                     <Card>
                                        <CardHeader><CardTitle>Log-Rank Test</CardTitle></CardHeader>
                                        <CardContent>
                                            <Alert variant={results.log_rank_test.is_significant ? 'default' : 'secondary'}>
                                                <AlertTitle>{results.log_rank_test.is_significant ? 'Significant Difference Found' : 'No Significant Difference'}</AlertTitle>
                                                <AlertDescription>
                                                    p-value: {results.log_rank_test.p_value.toFixed(4)}. There is a significant difference in survival curves between groups.
                                                </AlertDescription>
                                            </Alert>
                                        </CardContent>
                                    </Card>
                                )}
                             </div>
                        </TabsContent>
                        <TabsContent value="cox_ph" className="mt-4">
                            {results.cox_ph && (
                                <Card>
                                <CardHeader><CardTitle>Cox Proportional Hazards Model</CardTitle><CardDescription>Concordance: {results.cox_concordance.toFixed(4)}</CardDescription></CardHeader>
                                <CardContent>
                                     <Table>
                                        <TableHeader><TableRow><TableHead>Covariate</TableHead><TableHead>coef</TableHead><TableHead>exp(coef)</TableHead><TableHead>p</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {results.cox_ph.map((row: any, i: number) => (
                                                <TableRow key={i}><TableCell>{row.covariate}</TableCell><TableCell>{row.coef.toFixed(3)}</TableCell><TableCell>{row['exp(coef)'].toFixed(3)}</TableCell><TableCell>{row.p < 0.001 ? '<.001' : row.p.toFixed(4)}</TableCell></TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                            )}
                        </TabsContent>
                         <TabsContent value="aft" className="mt-4">
                            {results.aft_weibull && (
                                <Card>
                                    <CardHeader><CardTitle>Weibull AFT Model</CardTitle></CardHeader>
                                    <CardContent>
                                        {/* AFT results table */}
                                    </CardContent>
                                </Card>
                            )}
                         </TabsContent>
                    </Tabs>
                </div>
            )}
        </div>
    );
}
