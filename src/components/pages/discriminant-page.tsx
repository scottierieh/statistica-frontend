
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Users, CheckCircle, XCircle, Search, BarChart, Binary, AlertTriangle, HelpCircle, MoveRight, Settings, FileSearch } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { BarChart as RechartsBarChart, XAxis, YAxis, Legend, Tooltip, CartesianGrid, ReferenceLine, ScatterChart, Scatter } from 'recharts';
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
    box_m_test: { statistic: number | null; p_value: number | null; warning: string | null };
    group_centroids: number[][];
    lda_transformed_data: number[][];
    true_labels: number[];
}

interface FullAnalysisResponse {
    results: DiscriminantAnalysisResults;
    plots: {
      lda_scatter: string;
      [key: string]: string | null | undefined;
    }
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const discriminantExample = exampleDatasets.find(d => d.id === 'loan-approval');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Users size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Discriminant Analysis</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        A classification method that finds linear combinations of predictors to separate two or more groups.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                     <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Discriminant Analysis?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Discriminant Analysis is used to predict group membership from a set of continuous independent variables. It's particularly useful for understanding which variables are most powerful in distinguishing between groups and for creating a predictive model for classification. For example, it can be used to predict whether a customer will belong to a 'high-value' or 'low-value' segment based on their purchasing behavior.
                        </p>
                    </div>
                    <div className="flex justify-center">
                        {discriminantExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(discriminantExample)}>
                                <discriminantExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{discriminantExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{discriminantExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Group Variable:</strong> Select a categorical variable with two or more distinct groups that you want to predict (e.g., 'Customer Type').</li>
                                <li><strong>Predictor Variables:</strong> Choose the numeric variables that will be used to predict group membership (e.g., 'Age', 'Income', 'Spending').</li>
                                <li><strong>Run Analysis:</strong> The tool will create discriminant functions and classify your data.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Wilks' Lambda:</strong> A test of whether the discriminant functions are significant. A p-value less than 0.05 indicates the model can effectively separate the groups.</li>
                                <li><strong>Standardized Coefficients:</strong> Show the relative importance of each predictor in the discriminant function. Larger absolute values have more weight.</li>
                                <li><strong>Structure Matrix (Loadings):</strong> The correlation between each predictor and the discriminant function, helping to interpret the meaning of the function.</li>
                                <li><strong>Scatterplot:</strong> Visualizes how well the first two discriminant functions separate the groups. Well-separated clusters indicate a good model.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const GroupMeansChart = ({ centroids, groups, n_components }: { centroids: number[][], groups: string[], n_components: number }) => {
    if (!centroids || centroids.length === 0) return null;

    const chartData = Array.from({length: n_components}, (_, i) => {
        const entry: {name: string, [key: string]: number | string} = { name: `LD${i+1}` };
        groups.forEach((group, j) => {
            entry[group] = centroids[j]?.[i] || 0;
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
                         <RechartsBarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" />
                            {n_components > 1 && <YAxis />}
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign='top'/>
                             <ReferenceLine y={0} stroke="#666" />
                            {groups.map((group) => (
                                <Bar key={group} dataKey={group} fill={`var(--color-${group})`} radius={4} />
                            ))}
                        </RechartsBarChart>
                    </ResponsiveContainer>
                 </ChartContainer>
            </CardContent>
        </Card>
    );
};


const ResultDisplay = ({ results, plots }: { results: DiscriminantAnalysisResults, plots: FullAnalysisResponse['plots'] }) => {
    const isSignificant = results.wilks_lambda.p_value < 0.05;

    return (
        <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Overall Model Significance (Wilks' Lambda)</CardTitle>
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
                        <CardTitle className="flex items-center gap-2"><Search/> Discriminant Function Plot</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {plots.lda_scatter && <Image src={`data:image/png;base64,${plots.lda_scatter}`} alt="Discriminant Analysis Plot" width={800} height={600} className="rounded-md border" />}
                    </CardContent>
                </Card>
                 <GroupMeansChart centroids={results.group_centroids} groups={results.meta.groups} n_components={results.meta.n_components} />
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
                                        {results.meta.groups.map(g => <TableCell key={g} className="font-mono text-right">{results.classification_function_coeffs![g][i]?.toFixed(4) || 'N/A'}</TableCell>)}
                                    </TableRow>
                                ))}
                                <TableRow className="font-bold border-t-2">
                                    <TableCell>(Constant)</TableCell>
                                    {results.meta.groups.map(g => <TableCell key={g} className="font-mono text-right">{results.classification_function_intercepts![g]?.toFixed(4) || 'N/A'}</TableCell>)}
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};


interface DiscriminantPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}


export default function DiscriminantPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: DiscriminantPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [groupVar, setGroupVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [predictorVars, setPredictorVars] = useState<string[]>(numericHeaders);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setGroupVar(categoricalHeaders[0] || '');
        setPredictorVars(numericHeaders);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [categoricalHeaders, numericHeaders, data]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1 && categoricalHeaders.length >= 1, [data, numericHeaders, categoricalHeaders]);
    
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

        } catch (e: any) {
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

    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const { results, plots } = analysisResult || {};

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Discriminant Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
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
                    <div className="flex justify-end">
                        <Button onClick={handleAnalysis} className="w-full md:w-auto" disabled={!groupVar || predictorVars.length < 1 || isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                        </Button>
                    </div>
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
            
            {results && plots?.lda_scatter && <ResultDisplay results={results} plots={plots} />}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Users className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select variables and click 'Run Analysis' to see the results.</p>
                </div>
            )}
        </div>
    );
}

    