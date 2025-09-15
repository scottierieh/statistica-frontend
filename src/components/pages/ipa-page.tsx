
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar, BarChart, Cell } from 'recharts';

interface IpaMatrixItem {
    attribute: string;
    importance: number;
    performance: number;
    quadrant: string;
    importance_performance_gap: number;
    priority_score: number;
    effectiveness_index: number;
    improvement_potential: number;
}
interface RegressionSummary {
    r2: number;
    adj_r2: number;
    f_stat: number;
    f_pvalue: number;
    predictions: number[];
    residuals: number[];
}

interface AdvancedMetrics {
    sensitivity: { [key: string]: { r2_change: number; relative_importance: number; } };
    outliers: { standardized_residuals: number[]; cooks_distance: number[] };
}

interface IpaResults {
    ipa_matrix: IpaMatrixItem[];
    regression_summary: RegressionSummary;
    advanced_metrics: AdvancedMetrics;
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

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    
    const results = analysisResult?.results;
    
    const diagnosticsData = useMemo(() => {
        if (!results?.regression_summary?.predictions || !results?.regression_summary?.residuals) return [];
        return results.regression_summary.predictions.map((p, i) => ({
            prediction: p,
            residual: results.regression_summary.residuals[i]
        }));
    }, [results]);

    useEffect(() => {
        const satisfactionCols = numericHeaders.filter(h => h.toLowerCase().includes('satisfaction') || h.toLowerCase().includes('rating'));
        const defaultDepVar = satisfactionCols.find(h => h.toLowerCase().includes('overall')) || satisfactionCols[0] || numericHeaders[numericHeaders.length - 1];
        setDependentVar(defaultDepVar);

        const defaultIndepVars = numericHeaders.filter(h => h !== defaultDepVar && !h.toLowerCase().includes('id'));
        setIndependentVars(defaultIndepVars);
        setAnalysisResult(null);

    }, [data, numericHeaders]);

    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== dependentVar), [numericHeaders, dependentVar]);
    
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
                <Tabs defaultValue="matrix" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="matrix">IPA Matrix</TabsTrigger>
                        <TabsTrigger value="summary">Results Table</TabsTrigger>
                        <TabsTrigger value="advanced">Advanced Dashboard</TabsTrigger>
                        <TabsTrigger value="diagnostics">Model Diagnostics</TabsTrigger>
                    </TabsList>
                    <TabsContent value="matrix" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Importance-Performance Matrix</CardTitle>
                                <CardDescription>Visualizing attribute performance vs. derived importance to identify strategic priorities.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <Image src={analysisResult.plot} alt="IPA Matrix" width={1400} height={1000} className="w-full rounded-md border" />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="summary" className="mt-4">
                        <Card>
                            <CardHeader><CardTitle>Quadrant Summary & Results</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow><TableHead>Attribute</TableHead><TableHead>Quadrant</TableHead><TableHead className="text-right">Importance</TableHead><TableHead className="text-right">Performance</TableHead></TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.ipa_matrix.map(item => (
                                            <TableRow key={item.attribute}>
                                                <TableCell className="font-semibold">{item.attribute}</TableCell>
                                                <TableCell>{item.quadrant}</TableCell>
                                                <TableCell className="text-right font-mono">{item.importance.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{item.performance.toFixed(3)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                     <TabsContent value="advanced" className="mt-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader><CardTitle>Improvement Priority Ranking</CardTitle></CardHeader>
                                <CardContent>
                                    <ChartContainer config={{}} className="w-full h-[300px]">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={[...results.ipa_matrix].sort((a, b) => a.priority_score - b.priority_score)} layout="vertical" margin={{ left: 100 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis type="number" />
                                                <YAxis dataKey="attribute" type="category" />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Bar dataKey="priority_score" name="Priority Score" fill="hsl(var(--primary))" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>Importance-Performance Gap</CardTitle></CardHeader>
                                <CardContent>
                                    <ChartContainer config={{}} className="w-full h-[300px]">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={results.ipa_matrix}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="attribute" tick={{fontSize: 10}}/>
                                                <YAxis />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Bar dataKey="importance_performance_gap" name="Importance - Performance">
                                                    {results.ipa_matrix.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.importance_performance_gap > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--chart-2))'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader><CardTitle>R² Contribution by Variable</CardTitle></CardHeader>
                                <CardContent>
                                     <ChartContainer config={{}} className="w-full h-[300px]">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={Object.entries(results.advanced_metrics.sensitivity).map(([key, value]) => ({ name: key, ...value }))}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" tick={{fontSize: 10}} />
                                                <YAxis unit="%"/>
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Bar dataKey="relative_importance" name="Relative Importance (%)" fill="hsl(var(--primary))" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader><CardTitle>Outlier Detection (Standardized Residuals)</CardTitle></CardHeader>
                                <CardContent>
                                    <ChartContainer config={{}} className="w-full h-[300px]">
                                        <ResponsiveContainer width="100%" height={300}>
                                            <ScatterChart>
                                                <CartesianGrid />
                                                <XAxis type="number" dataKey="index" name="Index" />
                                                <YAxis type="number" dataKey="value" name="Std. Residual" />
                                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />}/>
                                                <Scatter data={results.advanced_metrics.outliers.standardized_residuals.map((val, i) => ({index: i, value: val}))} fill="hsl(var(--primary))" />
                                            </ScatterChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                    <TabsContent value="diagnostics" className="mt-4">
                        <Card>
                            <CardHeader><CardTitle>Model Diagnostics</CardTitle><CardDescription>Assessing the quality of the underlying regression model.</CardDescription></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                    <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">R²</p><p className="text-2xl font-bold">{results.regression_summary.r2.toFixed(3)}</p></div>
                                    <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Adjusted R²</p><p className="text-2xl font-bold">{results.regression_summary.adj_r2.toFixed(3)}</p></div>
                                    <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">F-statistic</p><p className="text-2xl font-bold">{results.regression_summary.f_stat.toFixed(2)}</p></div>
                                    <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">p-value</p><p className="text-2xl font-bold">{results.regression_summary.f_pvalue < 0.001 ? '<.001' : results.regression_summary.f_pvalue.toExponential(2)}</p></div>
                                </div>
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Residuals vs. Fitted Plot</CardTitle></CardHeader>
                                    <CardContent>
                                        <ChartContainer config={{}} className="w-full h-[300px]">
                                            <ResponsiveContainer width="100%" height={300}>
                                                <ScatterChart>
                                                    <CartesianGrid />
                                                    <XAxis type="number" dataKey="prediction" name="Fitted Value" />
                                                    <YAxis type="number" dataKey="residual" name="Residual" />
                                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />}/>
                                                    {diagnosticsData.length > 0 &&
                                                        <Scatter data={diagnosticsData} fill="hsl(var(--primary))" />
                                                    }
                                                </ScatterChart>
                                            </ResponsiveContainer>
                                        </ChartContainer>
                                    </CardContent>
                                 </Card>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
