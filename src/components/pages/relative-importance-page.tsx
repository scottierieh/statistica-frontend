
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Percent } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface ImportanceResult {
    predictor: string;
    standardized_beta: number;
    semi_partial_r2: number;
    relative_weight_pct: number;
    rank: number;
}

interface FullAnalysisResponse {
    results: ImportanceResult[];
}

interface RelativeImportancePageProps {
    data: DataSet;
    numericHeaders: string[];
}

export default function RelativeImportancePage({ data, numericHeaders }: RelativeImportancePageProps) {
    const { toast } = useToast();
    const [dependentVar, setDependentVar] = useState<string | undefined>(numericHeaders[numericHeaders.length - 1]);
    const [independentVars, setIndependentVars] = useState<string[]>(numericHeaders.slice(0, numericHeaders.length - 1));
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const availableIVs = useMemo(() => numericHeaders.filter(h => h !== dependentVar), [numericHeaders, dependentVar]);

    useEffect(() => {
        const defaultTarget = numericHeaders[numericHeaders.length - 1];
        setDependentVar(defaultTarget);
        setIndependentVars(numericHeaders.filter(h => h !== defaultTarget));
        setAnalysisResult(null);
    }, [data, numericHeaders]);

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
            const response = await fetch('/api/analysis/relative-importance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependent_var: dependentVar, independent_vars: independentVars })
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Analysis failed');
            }
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, independentVars, toast]);

    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Relative Importance Analysis</CardTitle>
                    <CardDescription>Determine the relative contribution of each predictor to the overall R-squared.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                     <div>
                        <Label>Dependent Variable (Y)</Label>
                        <Select value={dependentVar} onValueChange={setDependentVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                        <Label>Independent Variables (X)</Label>
                        <ScrollArea className="h-32 border rounded-md p-4">
                            <div className="space-y-2">
                                {availableIVs.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`iv-${h}`} checked={independentVars.includes(h)} onCheckedChange={(c) => handleIVChange(h, c as boolean)} />
                                        <Label htmlFor={`iv-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !dependentVar || independentVars.length < 1}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-64 w-full"/></CardContent></Card>}

            {results && (
                <Card>
                    <CardHeader>
                        <CardTitle>Relative Importance Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Predictor</TableHead>
                                    <TableHead className="text-right">Standardized Beta</TableHead>
                                    <TableHead className="text-right">Semi-Partial R²</TableHead>
                                    <TableHead className="text-right">Relative Weight (%)</TableHead>
                                    <TableHead className="text-right">Rank</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.map(row => (
                                    <TableRow key={row.predictor}>
                                        <TableCell className="font-medium">{row.predictor}</TableCell>
                                        <TableCell className="text-right font-mono">{row.standardized_beta.toFixed(3)}</TableCell>
                                        <TableCell className="text-right font-mono">{row.semi_partial_r2.toFixed(3)}</TableCell>
                                        <TableCell className="text-right font-mono">{row.relative_weight_pct.toFixed(1)}%</TableCell>
                                        <TableCell className="text-right font-mono">{row.rank}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
