
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, TrendingUp } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Input } from '../ui/input';

interface RegressionResults {
    model_name: string;
    model_type: string;
    features: string[];
    metrics: {
        r2: number;
        adj_r2: number;
        rmse: number;
        mae: number;
    };
    diagnostics: {
        f_statistic?: number;
        f_pvalue?: number;
        durbin_watson?: number;
        vif?: { [key: string]: number };
        coefficients?: {
            params: { [key: string]: number };
            pvalues: { [key: string]: number };
        }
    };
    plot: string;
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

interface RegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function RegressionPage({ data, numericHeaders, onLoadExample }: RegressionPageProps) {
    const { toast } = useToast();
    const [targetVar, setTargetVar] = useState<string | undefined>(numericHeaders[numericHeaders.length - 1]);
    const [featureVars, setFeatureVars] = useState<string[]>(numericHeaders.slice(0, numericHeaders.length - 1));
    const [modelType, setModelType] = useState('linear');
    
    const [analysisResult, setAnalysisResult] = useState<RegressionResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== targetVar), [numericHeaders, targetVar]);
    
    useEffect(() => {
        const newTarget = numericHeaders[numericHeaders.length - 1];
        setTargetVar(newTarget);
        setFeatureVars(numericHeaders.filter(h => h !== newTarget));
        setAnalysisResult(null);
    }, [data, numericHeaders]);

    const handleFeatureSelectionChange = (header: string, checked: boolean) => {
        setFeatureVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!targetVar || featureVars.length < 1) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a target variable and at least one feature.'});
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch('/api/analysis/regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, targetVar, features: featureVars, modelType })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result: RegressionResults = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'Analysis Error', description: e.message})
            setAnalysisResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, targetVar, featureVars, modelType, toast]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    
    if (!canRun) {
        const regressionExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('regression'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Regression Analysis</CardTitle>
                        <CardDescription>
                           To perform regression, you need data with at least two numeric variables. Try an example dataset.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        {regressionExamples.map((ex) => (
                             <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                        <TrendingUp className="h-6 w-6 text-secondary-foreground" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                        <CardDescription className="text-xs">{ex.description}</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                        Load this data
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </CardContent>
                </Card>
            </div>
        )
    }

    const results = analysisResult;
    const coeffs = results?.diagnostics?.coefficients;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Regression Analysis Setup</CardTitle>
                    <CardDescription>Select a regression model type, then configure its variables and parameters.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={modelType} onValueChange={setModelType} className="w-full">
                        <TabsList className='mb-4'>
                            <TabsTrigger value="linear">Linear</TabsTrigger>
                            <TabsTrigger value="polynomial" disabled>Polynomial</TabsTrigger>
                            <TabsTrigger value="ridge" disabled>Ridge</TabsTrigger>
                            <TabsTrigger value="lasso" disabled>Lasso</TabsTrigger>
                        </TabsList>
                        <TabsContent value="linear">
                            <div className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <Label>Target Variable (Y)</Label>
                                        <Select value={targetVar} onValueChange={setTargetVar}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>Feature Variables (X)</Label>
                                        <ScrollArea className="h-32 border rounded-md p-4">
                                            <div className="space-y-2">
                                                {availableFeatures.map(h => (
                                                    <div key={h} className="flex items-center space-x-2">
                                                        <Checkbox id={`feat-${h}`} checked={featureVars.includes(h)} onCheckedChange={(c) => handleFeatureSelectionChange(h, c as boolean)} />
                                                        <label htmlFor={`feat-${h}`}>{h}</label>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                        {/* Placeholder for other model types */}
                        <TabsContent value="polynomial">...</TabsContent>
                        <TabsContent value="ridge">...</TabsContent>
                        <TabsContent value="lasso">...</TabsContent>
                    </Tabs>
                    <div className="flex justify-end mt-4">
                        <Button onClick={handleAnalysis} disabled={isLoading || !targetVar || featureVars.length < 1}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Model Summary</CardTitle>
                            <CardDescription>Key performance metrics for the {results.model_type.replace(/_/g, ' ')} model.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">R-squared</p><p className="text-2xl font-bold">{results.metrics.r2.toFixed(4)}</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Adj. R-squared</p><p className="text-2xl font-bold">{results.metrics.adj_r2.toFixed(4)}</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">RMSE</p><p className="text-2xl font-bold">{results.metrics.rmse.toFixed(3)}</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">MAE</p><p className="text-2xl font-bold">{results.metrics.mae.toFixed(3)}</p></div>
                        </CardContent>
                    </Card>
                    
                    {results.plot && (
                        <Card>
                            <CardHeader><CardTitle>Diagnostic Plots</CardTitle></CardHeader>
                            <CardContent><Image src={results.plot} alt="Regression Diagnostics" width={1500} height={1200} className="w-full rounded-md border"/></CardContent>
                        </Card>
                    )}

                    {coeffs && (
                        <Card>
                            <CardHeader><CardTitle>Coefficients</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Variable</TableHead><TableHead>Coefficient</TableHead><TableHead>p-value</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {Object.keys(coeffs.params).map(key => (
                                            <TableRow key={key}>
                                                <TableCell>{key}</TableCell>
                                                <TableCell className="font-mono">{coeffs.params[key].toFixed(4)}</TableCell>
                                                <TableCell className="font-mono">{coeffs.pvalues[key].toFixed(4)} {getSignificanceStars(coeffs.pvalues[key])}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                    
                    <div className="grid md:grid-cols-2 gap-4">
                       <Card>
                            <CardHeader><CardTitle>Model Diagnostics</CardTitle></CardHeader>
                            <CardContent>
                                <dl className="space-y-2 text-sm">
                                    <div className="flex justify-between"><span>F-statistic:</span><span className="font-mono">{results.diagnostics.f_statistic?.toFixed(3)} (p={results.diagnostics.f_pvalue?.toFixed(4)})</span></div>
                                    <div className="flex justify-between"><span>Durbin-Watson:</span><span className="font-mono">{results.diagnostics.durbin_watson?.toFixed(3)}</span></div>
                                </dl>
                            </CardContent>
                        </Card>
                         {results.diagnostics.vif && (
                            <Card>
                                <CardHeader><CardTitle>Multicollinearity (VIF)</CardTitle></CardHeader>
                                <CardContent>
                                     <dl className="space-y-2 text-sm">
                                        {Object.entries(results.diagnostics.vif).map(([key, value]) => (
                                            <div className="flex justify-between" key={key}>
                                                <span>{key}</span>
                                                <Badge variant={value > 5 ? 'destructive' : 'secondary'}>{value.toFixed(2)}</Badge>
                                            </div>
                                        ))}
                                     </dl>
                                </CardContent>
                            </Card>
                         )}
                    </div>
                </div>
            )}
        </div>
    );
}
