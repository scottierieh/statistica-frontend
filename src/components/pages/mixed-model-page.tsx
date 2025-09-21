
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Scaling, Users } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';

interface MixedModelResults {
    model_summary_data: { caption: string | null; data: string[][] }[];
    fixed_effects: { [key: string]: number };
    random_effects: { [key: string]: number };
    p_values: { [key: string]: number };
    log_likelihood: number;
    aic: number;
    bic: number;
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

interface MixedModelPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function MixedModelPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: MixedModelPageProps) {
    const { toast } = useToast();
    const [dependentVar, setDependentVar] = useState<string | undefined>();
    const [fixedEffects, setFixedEffects] = useState<string[]>([]);
    const [groupVar, setGroupVar] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<MixedModelResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2 && categoricalHeaders.length >= 1, [data, numericHeaders, categoricalHeaders]);

    const featureOptions = useMemo(() => numericHeaders.filter(h => h !== dependentVar), [numericHeaders, dependentVar]);
    
    useEffect(() => {
        setDependentVar(numericHeaders[0]);
        setFixedEffects(numericHeaders.slice(1,3));
        setGroupVar(categoricalHeaders[0]);
        setAnalysisResult(null);
    }, [data, numericHeaders, categoricalHeaders]);

    const handleFeatureChange = (header: string, checked: boolean) => {
        setFixedEffects(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || fixedEffects.length === 0 || !groupVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a dependent variable, at least one fixed effect, and a group variable.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch('/api/analysis/mixed-model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependent_var: dependentVar, fixed_effects: fixedEffects, group_var: groupVar })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result: MixedModelResults = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message })
            setAnalysisResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, fixedEffects, groupVar, toast]);
    
    if (!canRun) {
        const mixedModelExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('mixed-model'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Mixed Effects Model</CardTitle>
                        <CardDescription>
                           To run a mixed model, you need data with at least one numeric dependent variable, one numeric fixed effect, and one categorical grouping variable.
                        </CardDescription>
                    </CardHeader>
                    {/* Example data loader can be added here if available */}
                </Card>
            </div>
        )
    }

    const results = analysisResult;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Mixed Effects Model Setup</CardTitle>
                    <CardDescription>Select the dependent variable, fixed effects (predictors), and the grouping variable for random effects.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Dependent Variable (Y)</Label>
                            <Select value={dependentVar} onValueChange={setDependentVar}>
                                <SelectTrigger><SelectValue placeholder="Select target"/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                             <Label>Grouping Variable</Label>
                            <Select value={groupVar} onValueChange={setGroupVar}>
                                <SelectTrigger><SelectValue placeholder="Select group"/></SelectTrigger>
                                <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                             <Label>Fixed Effects (Predictors)</Label>
                            <ScrollArea className="h-32 border rounded-md p-4">
                                {featureOptions.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`feat-${h}`} checked={fixedEffects.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                        <Label htmlFor={`feat-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !dependentVar || fixedEffects.length === 0 || !groupVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}
            
            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Model Summary</CardTitle></CardHeader>
                        <CardContent>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">AIC</p><p className="text-2xl font-bold">{results.aic.toFixed(2)}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">BIC</p><p className="text-2xl font-bold">{results.bic.toFixed(2)}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Log-Likelihood</p><p className="text-2xl font-bold">{results.log_likelihood.toFixed(2)}</p></div>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Model Results</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            {results.model_summary_data?.map((table, tableIndex) => (
                                <div key={tableIndex}>
                                <h3 className="font-semibold mb-2">{table.caption}</h3>
                                <Table>
                                    <TableHeader><TableRow>{table.data[0].map((cell, cellIndex) => <TableHead key={cellIndex}>{cell}</TableHead>)}</TableRow></TableHeader>
                                    <TableBody>
                                    {table.data.slice(1).map((row, rowIndex) => (
                                        <TableRow key={rowIndex}>{row.map((cell, cellIndex) => <TableCell key={cellIndex} className="font-mono">{cell}</TableCell>)}</TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
