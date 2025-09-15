'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Target } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';

interface IpaResults {
    ipa_matrix: {
        attribute: string;
        importance: number;
        performance: number;
        quadrant: string;
    }[];
    regression_summary: {
        r2: number;
        adj_r2: number;
        f_stat: number;
        f_pvalue: number;
    };
}

interface FullAnalysisResponse {
    results: IpaResults;
    plot: string; // base64 image
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

    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== dependentVar), [numericHeaders, dependentVar]);

    useEffect(() => {
        const satisfactionCols = numericHeaders.filter(h => h.toLowerCase().includes('satisfaction') || h.toLowerCase().includes('rating'));
        const defaultDepVar = satisfactionCols.find(h => h.toLowerCase().includes('overall')) || satisfactionCols[0] || numericHeaders[numericHeaders.length - 1];
        setDependentVar(defaultDepVar);

        const defaultIndepVars = numericHeaders.filter(h => h !== defaultDepVar && !h.toLowerCase().includes('id'));
        setIndependentVars(defaultIndepVars);
        setAnalysisResult(null);

    }, [data, numericHeaders]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const handleIndepVarChange = (header: string, checked: boolean) => {
        setIndependentVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || independentVars.length === 0) {
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
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            setAnalysisResult(result);

        } catch (e: any) {
            console.error('IPA Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, independentVars, toast]);

    if (!canRun) {
        const ipaExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('ipa'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Importance-Performance Analysis (IPA)</CardTitle>
                        <CardDescription>
                           To perform IPA, you need data with at least two numeric variables. One for overall satisfaction and others for specific attributes. Try an example dataset.
                        </CardDescription>
                    </CardHeader>
                     {ipaExamples.length > 0 && (
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ipaExamples.map((ex) => (
                                    <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                        <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                                <Target className="h-6 w-6 text-secondary-foreground" />
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
                    <CardTitle className="font-headline">IPA Setup</CardTitle>
                    <CardDescription>Select your dependent variable (overall satisfaction) and independent variables (attributes).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Dependent Variable (Overall Satisfaction)</Label>
                            <Select value={dependentVar} onValueChange={setDependentVar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Independent Variables (Attributes)</Label>
                            <ScrollArea className="h-40 border rounded-md p-4">
                                {availableFeatures.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`iv-${h}`} checked={independentVars.includes(h)} onCheckedChange={(c) => handleIndepVarChange(h, c as boolean)}/>
                                        <Label htmlFor={`iv-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={!dependentVar || independentVars.length === 0 || isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2" />Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[500px] w-full" /></CardContent></Card>}

            {results && analysisResult?.plot && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">IPA Matrix</CardTitle>
                            <CardDescription>Visualizing attribute performance vs. derived importance to identify strategic priorities.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Image src={analysisResult.plot} alt="IPA Matrix" width={1400} height={1000} className="w-full rounded-md border" />
                        </CardContent>
                    </Card>
                    <div className="grid md:grid-cols-2 gap-4">
                         <Card>
                            <CardHeader><CardTitle>Quadrant Summary</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow><TableHead>Quadrant</TableHead><TableHead>Attributes</TableHead></TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {['Concentrate Here', 'Keep Up Good Work', 'Low Priority', 'Possible Overkill'].map(q => (
                                            <TableRow key={q}>
                                                <TableCell className="font-semibold">{q}</TableCell>
                                                <TableCell>{results.ipa_matrix.filter(item => item.quadrant === q).map(item => item.attribute).join(', ') || 'None'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Model Fit</CardTitle></CardHeader>
                            <CardContent>
                                 <dl className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <dt className="text-muted-foreground">R²</dt>
                                        <dd className="font-mono text-lg">{results.regression_summary.r2.toFixed(3)}</dd>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <dt className="text-muted-foreground">Adj. R²</dt>
                                        <dd className="font-mono text-lg">{results.regression_summary.adj_r2.toFixed(3)}</dd>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <dt className="text-muted-foreground">F-statistic p-value</dt>
                                        <dd className="font-mono text-lg">{results.regression_summary.f_pvalue.toFixed(4)}</dd>
                                    </div>
                                </dl>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
