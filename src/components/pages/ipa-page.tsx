
'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Flame, Star, Target as TargetIcon, TrendingDown, Sparkles, Sigma } from 'lucide-react';
import type { DataSet } from '@/lib/stats';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Skeleton } from '../ui/skeleton';

interface IpaMatrixItem {
    attribute: string;
    importance: number;
    performance: number;
    quadrant: string;
    priority_score: number;
    gap: number;
    r_squared?: number;
    relative_importance?: number;
}

interface RegressionSummary {
    r2: number;
    adj_r2: number;
    beta_coefficients: { attribute: string, beta: number }[];
}

interface IpaResults {
    ipa_matrix: IpaMatrixItem[];
    regression_summary: RegressionSummary;
}

interface FullAnalysisResponse {
    results: IpaResults;
    main_plot: string;
    dashboard_plot: string;
}

interface IpaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function IpaPage({ data, numericHeaders, onLoadExample }: IpaPageProps) {
    const { toast } = useToast();
    const [dependentVar, setDependentVar] = useState<string | undefined>();
    const [independentVars, setIndependentVars] = useState<string[]>([]);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const availableIVs = useMemo(() => numericHeaders.filter(h => h !== dependentVar), [numericHeaders, dependentVar]);
    
    useEffect(() => {
        const overallSat = numericHeaders.find(h => h.toLowerCase().includes('overall'));
        setDependentVar(overallSat || numericHeaders[numericHeaders.length - 1]);
    }, [numericHeaders]);

    useEffect(() => {
        setIndependentVars(availableIVs);
    }, [availableIVs]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const handleIVChange = (header: string, checked: boolean) => {
        setIndependentVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || independentVars.length < 1) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a dependent variable and at least one independent variable.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/ipa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVar, independentVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'API error');
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "IPA results are ready." });

        } catch (e: any) {
            toast({ title: "Analysis Error", description: (e as Error).message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, independentVars, toast]);
    
    if (!canRun) {
        const ipaExample = exampleDatasets.find(d => d.id === 'ipa-restaurant');
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <CardTitle>Importance-Performance Analysis (IPA)</CardTitle>
                        <CardDescription>
                            To perform IPA, please upload data with at least two numeric variables.
                        </CardDescription>
                    </CardHeader>
                    {ipaExample && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(ipaExample)}>Load Restaurant Satisfaction Data</Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        )
    }

    const { results, main_plot, dashboard_plot } = analysisResult || {};

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">IPA Setup</CardTitle>
                    <CardDescription>Select the dependent and independent variables for the analysis.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Overall Satisfaction (Dependent Var)</Label>
                        <Select value={dependentVar} onValueChange={setDependentVar}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Performance Attributes (Independent Vars)</Label>
                        <ScrollArea className="h-32 border rounded-md p-4">
                            <div className="grid grid-cols-2 gap-2">
                            {availableIVs.map(h => (
                                <div key={h} className="flex items-center space-x-2">
                                    <Checkbox id={`iv-${h}`} checked={independentVars.includes(h)} onCheckedChange={c => handleIVChange(h, c as boolean)} />
                                    <Label htmlFor={`iv-${h}`}>{h}</Label>
                                </div>
                            ))}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="animate-spin mr-2" /> Running...</> : <><Sigma className="mr-2" /> Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Skeleton className="w-full h-96" />}

            {results && (
                <Tabs defaultValue="dashboard">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        <TabsTrigger value="matrix">IPA Matrix</TabsTrigger>
                    </TabsList>
                    <TabsContent value="dashboard" className="mt-4">
                        {dashboard_plot && <Card><CardHeader><CardTitle>Analysis Dashboard</CardTitle></CardHeader><CardContent><Image src={`data:image/png;base64,${dashboard_plot}`} alt="IPA Dashboard" width={1800} height={1200} className="w-full h-auto rounded-md border" /></CardContent></Card>}
                    </TabsContent>
                    <TabsContent value="matrix" className="mt-4">
                        {main_plot && <Card><CardHeader><CardTitle>IPA Matrix</CardTitle></CardHeader><CardContent><Image src={`data:image/png;base64,${main_plot}`} alt="IPA Matrix" width={1000} height={800} className="w-full h-auto rounded-md border" /></CardContent></Card>}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
