
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Atom, AlertTriangle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface AnalysisResponse {
    results: {
        parameters: { [key: string]: number };
        standard_errors: { [key: string]: number };
        p_values: { [key: string]: number };
        r_squared: number;
        aic: number | null;
        rss: number | null;
        interpretation: string;
    };
    plot: string;
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};


interface NonlinearRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function NonlinearRegressionPage({ data, numericHeaders, onLoadExample }: NonlinearRegressionPageProps) {
    const { toast } = useToast();
    const [xCol, setXCol] = useState<string | undefined>();
    const [yCol, setValueCol] = useState<string | undefined>();
    const [modelType, setModelType] = useState('exponential');
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    
    useEffect(() => {
        setXCol(numericHeaders[0]);
        setValueCol(numericHeaders[1]);
        setAnalysisResult(null);
    }, [data, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!xCol || !yCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both X and Y columns.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/nonlinear-regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    x_col: xCol, 
                    y_col: yCol, 
                    model_type: modelType
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Nonlinear Regression error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, xCol, yCol, modelType, toast]);

    if (!canRun) {
        const trendExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('nonlinear-regression'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Nonlinear Regression</CardTitle>
                        <CardDescription>
                           To perform nonlinear regression, you need data with at least two numeric variables.
                        </CardDescription>
                    </CardHeader>
                     {trendExamples.length > 0 && (
                        <CardContent>
                             <Button onClick={() => onLoadExample(trendExamples[0])} className="w-full">
                                Load {trendExamples[0].name}
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
                    <CardTitle className="font-headline">Nonlinear Regression Setup</CardTitle>
                    <CardDescription>Select variables and a model type to fit a nonlinear curve.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>X Column (Predictor)</Label>
                            <Select value={xCol} onValueChange={setXCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Y Column (Outcome)</Label>
                            <Select value={yCol} onValueChange={setValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h=>h !== xCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Model Type</Label>
                            <Select value={modelType} onValueChange={setModelType}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
                                <SelectItem value="exponential">Exponential (a * e^(b*x))</SelectItem>
                                <SelectItem value="logarithmic">Logarithmic (a + b*ln(x))</SelectItem>
                                <SelectItem value="power">Power (a * x^b)</SelectItem>
                                <SelectItem value="sigmoid">Sigmoid (Logistic)</SelectItem>
                            </SelectContent></Select>
                        </div>
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
                            <CardTitle className="font-headline">Model Fit & Interpretation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Key Findings</AlertTitle>
                                <AlertDescription>
                                    <p className="whitespace-pre-wrap">{results.interpretation}</p>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">{modelType.charAt(0).toUpperCase() + modelType.slice(1)} Regression Fit</CardTitle>
                            <CardDescription>
                                R-squared: <Badge>{results.r_squared.toFixed(4)}</Badge> | AIC: <Badge variant="secondary">{results.aic !== null ? results.aic.toFixed(2) : 'N/A'}</Badge> | RSS: <Badge variant="secondary">{results.rss !== null ? results.rss.toFixed(2) : 'N/A'}</Badge>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className='grid md:grid-cols-2 gap-4'>
                            <Image src={analysisResult.plot} alt="Nonlinear Regression Plot" width={800} height={600} className="w-full rounded-md border"/>
                            <div>
                                <h3 className="font-semibold mb-2">Fitted Parameters</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Parameter</TableHead>
                                            <TableHead className="text-right">Estimate</TableHead>
                                            <TableHead className="text-right">Std. Error</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.parameters).map(([param, value]) => (
                                            <TableRow key={param}>
                                                <TableCell>{param}</TableCell>
                                                <TableCell className="text-right font-mono">{value.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{results.standard_errors[param]?.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{results.p_values[param] < 0.001 ? '<.001' : results.p_values[param]?.toFixed(4)} {getSignificanceStars(results.p_values[param])}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
