
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Users, CheckCircle, XCircle, Search, BarChart3, Binary } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ZAxis
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import Image from 'next/image';

interface AnalysisResults {
    eda: {
        pair_plot: string | null;
        heatmap: string | null;
    },
    lda_results: {
        explained_variance_ratio: number[];
        lda_train_transformed: number[][];
        train_labels: number[];
    },
    classification_results: {
        accuracy: number;
        confusion_matrix: number[][];
    },
    meta: {
        groups: string[];
        n_components: number;
    }
}

const ConfusionMatrix = ({ matrix, groups }: { matrix: number[][], groups: string[] }) => {
    const maxVal = Math.max(...matrix.flat());
    const getCellColor = (value: number, row: number, col: number) => {
        if (row === col) return `hsl(var(--primary) / ${Math.max(0.1, value / maxVal)})`;
        return `hsl(var(--destructive) / ${Math.max(0.1, value / maxVal)})`;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Actual \ Predicted</TableHead>
                    {groups.map(g => <TableHead key={g} className="text-center">{g}</TableHead>)}
                </TableRow>
            </TableHeader>
            <TableBody>
                {groups.map((g, rowIndex) => (
                    <TableRow key={g}>
                        <TableHead>{g}</TableHead>
                        {groups.map((_, colIndex) => (
                            <TableCell key={`${g}-${colIndex}`} className="text-center font-mono" style={{ backgroundColor: getCellColor(matrix[rowIndex][colIndex], rowIndex, colIndex) }}>
                                {matrix[rowIndex][colIndex]}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

const LdaScatterPlot = ({ data, groups, explainedVariance }: { data: number[][], groups: string[], explainedVariance: number[] }) => {
    const chartData = data.map((point, index) => ({
        ld1: point[0],
        ld2: point.length > 1 ? point[1] : 0,
        group: groups[index]
    }));

    const chartConfig = groups.reduce((acc, group, i) => {
        acc[group] = { label: group, color: `hsl(var(--chart-${i + 1}))` };
        return acc;
    }, {} as any);

    return (
        <ChartContainer config={chartConfig} className="w-full h-96">
            <ResponsiveContainer>
                <ScatterChart>
                    <XAxis type="number" dataKey="ld1" name={`LD1 (${(explainedVariance[0] * 100).toFixed(1)}%)`} />
                    <YAxis type="number" dataKey="ld2" name={explainedVariance.length > 1 ? `LD2 (${(explainedVariance[1] * 100).toFixed(1)}%)` : ''} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                    <Legend />
                    {groups.map((group, i) => (
                        <Scatter key={group} name={group} data={chartData.filter(d => d.group === group)} fill={`var(--color-${group})`} />
                    ))}
                </ScatterChart>
            </ResponsiveContainer>
        </ChartContainer>
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
    const [groupVar, setGroupVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [predictorVars, setPredictorVars] = useState<string[]>(numericHeaders);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResults | null>(null);
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
        };

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

    const { results } = { results: analysisResult };

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
                                    {numericHeaders.map(header => (
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
            
            {results ? (
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Search/> Exploratory Data Analysis</CardTitle></CardHeader>
                        <CardContent className="grid lg:grid-cols-2 gap-4">
                            {results.eda.pair_plot ? <Image src={results.eda.pair_plot} alt="Pair Plot" width={600} height={600} className="rounded-md border" /> : <Skeleton className="h-96 w-full"/>}
                            {results.eda.heatmap ? <Image src={results.eda.heatmap} alt="Heatmap" width={600} height={600} className="rounded-md border"/> : <Skeleton className="h-96 w-full"/>}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 /> Classification Results</CardTitle></CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-4">
                             <div>
                                <h3 className="font-semibold text-center mb-2">Overall Accuracy</h3>
                                <div className="p-4 bg-muted rounded-lg text-center"><p className="text-4xl font-bold">{(results.classification_results.accuracy * 100).toFixed(2)}%</p></div>
                             </div>
                             <div>
                                <h3 className="font-semibold text-center mb-2">Confusion Matrix</h3>
                                <ConfusionMatrix matrix={results.classification_results.confusion_matrix} groups={results.meta.groups} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><Binary/> LDA Transformed Data</CardTitle></CardHeader>
                        <CardContent>
                            <LdaScatterPlot data={results.lda_results.lda_train_transformed} groups={results.lda_results.train_labels.map(l => results.meta.groups[l])} explainedVariance={results.lda_results.explained_variance_ratio} />
                        </CardContent>
                    </Card>
                </div>
            ) : (
                 !isLoading && <div className="text-center text-muted-foreground py-10">
                    <Users className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select variables and click 'Run Analysis' to see the results.</p>
                </div>
            )}
        </div>
    );
}
