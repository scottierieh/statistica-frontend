
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RegressionResult {
    params: number[];
    bse: number[];
    r_squared?: number;
}

interface FullAnalysisResponse {
    results: {
        ols: RegressionResult;
        rlm: RegressionResult;
    };
    plot: string;
}

export default function RobustRegressionPage({ data, numericHeaders }: { data: DataSet; numericHeaders: string[]; }) {
    const { toast } = useToast();
    const [xCol, setXCol] = useState<string | undefined>();
    const [yCol, setYCol] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    
    useEffect(() => {
        if(canRun) {
            setXCol(numericHeaders[0]);
            setYCol(numericHeaders[1]);
        }
    }, [canRun, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!xCol || !yCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both X and Y columns.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/robust-regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, x_col: xCol, y_col: yCol })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, xCol, yCol, toast]);

    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Robust Regression Setup</CardTitle>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Independent Variable (X)</Label>
                        <Select value={xCol} onValueChange={setXCol}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Dependent Variable (Y)</Label>
                        <Select value={yCol} onValueChange={setYCol}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{numericHeaders.filter(h => h !== xCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !xCol || !yCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && analysisResult?.plot && (
                <div className="space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Robust Regression vs. OLS</CardTitle>
                            <CardDescription>Comparison of the Robust Linear Model (RLM) fit against the Ordinary Least Squares (OLS) fit.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Robust Regression Plot" width={800} height={600} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle>OLS Results</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead className="text-right">Coefficient</TableHead><TableHead className="text-right">Std. Error</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        <TableRow><TableCell>Intercept</TableCell><TableCell className="text-right font-mono">{results.ols.params[0].toFixed(4)}</TableCell><TableCell className="text-right font-mono">{results.ols.bse[0].toFixed(4)}</TableCell></TableRow>
                                        <TableRow><TableCell>{xCol}</TableCell><TableCell className="text-right font-mono">{results.ols.params[1].toFixed(4)}</TableCell><TableCell className="text-right font-mono">{results.ols.bse[1].toFixed(4)}</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                                <p className="text-sm mt-2"><strong>R-squared:</strong> {results.ols.r_squared?.toFixed(4)}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>RLM Results</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Parameter</TableHead><TableHead className="text-right">Coefficient</TableHead><TableHead className="text-right">Std. Error</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        <TableRow><TableCell>Intercept</TableCell><TableCell className="text-right font-mono">{results.rlm.params[0].toFixed(4)}</TableCell><TableCell className="text-right font-mono">{results.rlm.bse[0].toFixed(4)}</TableCell></TableRow>
                                        <TableRow><TableCell>{xCol}</TableCell><TableCell className="text-right font-mono">{results.rlm.params[1].toFixed(4)}</TableCell><TableCell className="text-right font-mono">{results.rlm.bse[1].toFixed(4)}</TableCell></TableRow>
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
