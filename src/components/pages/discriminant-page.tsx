
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Users, CheckCircle, XCircle, Search, BarChart3, Binary, AlertTriangle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { BarChart, XAxis, YAxis, Legend, Tooltip, Bar, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';


interface DiscriminantAnalysisResults {
    meta: {
        groups: string[];
        n_components: number;
        predictor_vars: string[];
    };
    classification_metrics: {
        accuracy: number;
        confusion_matrix: number[][];
    };
    eigenvalues: number[];
    canonical_correlations: number[];
    wilks_lambda: {
        lambda: number;
        F: number;
        df1: number;
        df2: number;
        p_value: number;
    };
    standardized_coeffs: number[][];
    structure_matrix: number[][];
    classification_function_coeffs?: {
      [key: string]: number[]
    };
    classification_function_intercepts?: {
        [key: string]: number
    };
    group_stats: { [key: string]: { mean: number[]; std: number[]; n: number } };
    box_m_test: { statistic: number; p_value: number };
    group_centroids: number[][];
    lda_transformed_data: number[][];
    true_labels: number[];
}

interface FullAnalysisResponse {
    results: DiscriminantAnalysisResults;
    plot: string;
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};


interface DiscriminantPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

const GroupMeansChart = ({ data, groups }: { data: { [key: string]: { mean: number[] } }, groups: string[] }) => {
    if (!data || Object.keys(data).length === 0) return null;

    const predictorVars = Object.keys(data[Object.keys(data)[0]].mean);
    
    const chartData = predictorVars.map((_, i) => {
        const entry: {name: string, [key: string]: number | string} = { name: `LD${i+1}` };
        groups.forEach(group => {
            entry[group] = data[group]?.mean[i] || 0;
        });
        return entry;
    });
    
    const chartConfig = groups.reduce((acc, group, i) => {
        acc[group] = { label: group, color: `hsl(var(--chart-${(i % 5) + 1}))` };
        return acc;
    }, {} as any);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Group Centroids on Discriminant Functions</CardTitle>
                <CardDescription>Average discriminant scores for each group.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={chartConfig} className="w-full h-[300px]">
                     <ResponsiveContainer>
                         <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{fontSize: 12}} />
                            <YAxis />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign='top'/>
                            {groups.map((group, i) => (
                                <Bar key={group} dataKey={group} fill={`var(--color-${group})`} radius={4} />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                 </ChartContainer>
            </CardContent>
        </Card>
    );
};


const ResultDisplay = ({ results, plot }: { results: DiscriminantAnalysisResults, plot: string }) => {
    const isSignificant = results.wilks_lambda.p_value < 0.05;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Search/> Analysis Plot</CardTitle>
                </CardHeader>
                <CardContent className="grid lg:grid-cols-1 gap-4">
                    <Image src={plot} alt="Discriminant Analysis Plot" width={1500} height={1200} className="rounded-md border" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Overall Model Significance</CardTitle>
                </CardHeader>
                <CardContent>
                    <Alert variant={isSignificant ? 'default' : 'destructive'}>
                        {isSignificant ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                        <AlertTitle>
                            {isSignificant ? 'Model is Statistically Significant' : 'Model is Not Statistically Significant'}
                        </AlertTitle>
                        <AlertDescription>
                            Wilks' Lambda = {results.wilks_lambda.lambda.toFixed(4)}, F({results.wilks_lambda.df1.toFixed(0)}, {results.wilks_lambda.df2.toFixed(0)}) = {results.wilks_lambda.F.toFixed(2)}, p {results.wilks_lambda.p_value < 0.001 ? '< .001' : `= ${results.wilks_lambda.p_value.toFixed(4)}`}. This indicates the model can {isSignificant ? 'significantly' : 'not significantly'} differentiate between the groups.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
            <div className="grid lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Canonical Discriminant Functions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Function</TableHead><TableHead className="text-right">Eigenvalue</TableHead><TableHead className="text-right">% of Variance</TableHead><TableHead className="text-right">Canonical Corr.</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {results.eigenvalues.map((eig, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{i + 1}</TableCell>
                                        <TableCell className="font-mono text-right">{eig.toFixed(4)}</TableCell>
                                        <TableCell className="font-mono text-right">{(eig / results.eigenvalues.reduce((a, b) => a + b, 0) * 100).toFixed(2)}%</TableCell>
                                        <TableCell className="font-mono text-right">{results.canonical_correlations[i].toFixed(4)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <GroupMeansChart data={results.group_stats} groups={results.meta.groups} />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Standardized Canonical Coefficients</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Variable</TableHead>{Array.from({length: results.meta.n_components}).map((_, i) => <TableHead key={i} className="text-right">LD{i+1}</TableHead>)}</TableRow></TableHeader>
                            <TableBody>
                                {results.meta.predictor_vars.map((v, i) => (
                                    <TableRow key={v}>
                                        <TableCell>{v}</TableCell>
                                        {results.standardized_coeffs[i]?.map((c, j) => <TableCell key={j} className="font-mono text-right">{c.toFixed(4)}</TableCell>)}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Structure Matrix (Loadings)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Variable</TableHead>{Array.from({length: results.meta.n_components}).map((_, i) => <TableHead key={i} className="text-right">LD{i+1}</TableHead>)}</TableRow></TableHeader>
                            <TableBody>
                                {results.meta.predictor_vars.map((v, i) => (
                                    <TableRow key={v}>
                                        <TableCell>{v}</TableCell>
                                        {results.structure_matrix[i]?.map((c, j) => <TableCell key={j} className="font-mono text-right">{c.toFixed(4)}</TableCell>)}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            {results.classification_function_coeffs && results.classification_function_intercepts && (
                <Card>
                    <CardHeader><CardTitle>Classification Function Coefficients</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>Variable</TableHead>{results.meta.groups.map(g => <TableHead key={g} className="text-right">{g}</TableHead>)}</TableRow></TableHeader>
                            <TableBody>
                                {results.meta.predictor_vars.map((v, i) => (
                                    <TableRow key={v}>
                                        <TableCell>{v}</TableCell>
                                        {results.meta.groups.map(g => <TableCell key={g} className="font-mono text-right">{results.classification_function_coeffs![g][i].toFixed(4)}</TableCell>)}
                                    </TableRow>
                                ))}
                                <TableRow className="font-bold border-t-2">
                                    <TableCell>(Constant)</TableCell>
                                    {results.meta.groups.map(g => <TableCell key={g} className="font-mono text-right">{results.classification_function_intercepts![g].toFixed(4)}</TableCell>)}
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};


export default function DiscriminantPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: DiscriminantPageProps) {
    const { toast } = useToast();
    const [groupVar, setGroupVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [predictorVars, setPredictorVars] = useState<string[]>(numericHeaders);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setGroupVar(categoricalHeaders[0] || '');
        setPredictorVars(numericHeaders);
        setAnalysisResult(null);
    }, [categoricalHeaders, numericHeaders, data]);

    const canRun = useMemo(() => {
      return data.length > 0 && numericHeaders.length >= 1 && categoricalHeaders.length >= 1;
    }, [data, numericHeaders, categoricalHeaders]);
    
    const handlePredictorSelectionChange = (header: string, checked: boolean) => {
        setPredictorVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!groupVar || predictorVars.length < 1) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a group variable and at least one predictor variable.'});
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch('/api/analysis/discriminant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, groupVar, predictorVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);

        } catch(e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'Analysis Error', description: e.message || 'An unexpected error occurred.'})
            setAnalysisResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, groupVar, predictorVars, toast]);

    const availableFeatures = useMemo(() => {
        return numericHeaders.filter(h => h !== groupVar);
    }, [numericHeaders, groupVar]);

    if (!canRun) {
        const discriminantExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('discriminant'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Discriminant Analysis</CardTitle>
                        <CardDescription>
                           To perform this analysis, you need data with at least one categorical group variable and one numeric predictor variable. Try an example dataset.
                        </CardDescription>
                    </CardHeader>
                     {discriminantExamples.length > 0 && (
                        <CardContent>
                           <Button onClick={() => onLoadExample(discriminantExamples[0])} className="w-full" size="sm">
                                Load {discriminantExamples[0].name}
                            </Button>
                        </CardContent>
                    )}
                </Card>
            </div>
        )
    }

    const { results, plot } = analysisResult || {};

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Discriminant Analysis Setup</CardTitle>
                    <CardDescription>
                       Select variables to classify groups. Choose one categorical group variable and at least one numeric predictor.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                             <label className="text-sm font-medium mb-1 block">Group Variable (Categorical)</label>
                            <Select value={groupVar} onValueChange={setGroupVar} disabled={categoricalHeaders.length === 0}>
                                <SelectTrigger><SelectValue placeholder="Select a variable" /></SelectTrigger>
                                <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                         <div>
                            <label className="text-sm font-medium mb-1 block">Predictor Variables (Numeric)</label>
                             <ScrollArea className="h-32 border rounded-md p-4">
                                <div className="space-y-2">
                                    {availableFeatures.map(header => (
                                    <div key={header} className="flex items-center space-x-2">
                                        <Checkbox id={`pred-${header}`} checked={predictorVars.includes(header)} onCheckedChange={(checked) => handlePredictorSelectionChange(header, checked as boolean)} />
                                        <label htmlFor={`pred-${header}`} className="text-sm font-medium leading-none">{header}</label>
                                    </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                    <Button onClick={handleAnalysis} className="w-full md:w-auto self-end" disabled={!groupVar || predictorVars.length < 1 || isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                    </Button>
                </CardContent>
            </Card>

            {isLoading && (
                 <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-muted-foreground">Performing discriminant analysis...</p>
                        </div>
                    </CardContent>
                </Card>
            )}
            
            {results && plot && <ResultDisplay results={results} plot={plot} />}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Users className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select variables and click 'Run Analysis' to see the results.</p>
                </div>
            )}
        </div>
    );
}
