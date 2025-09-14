'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Users } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Type definitions for the Discriminant Analysis results
interface AnalysisResults {
    groups: string[];
    predictor_vars: string[];
    lda?: MethodResult;
    qda?: MethodResult;
}

interface MethodResult {
    metrics: {
        accuracy: number;
        confusion_matrix: number[][];
    };
    coefficients?: number[][];
    intercepts?: number[];
    group_means: number[][];
    priors: number[];
    explained_variance_ratio?: number[];
    error?: string;
}

const ConfusionMatrix = ({ matrix, groups }: { matrix: number[][], groups: string[] }) => {
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
                            <TableCell key={`${g}-${colIndex}`} className="text-center font-mono">{matrix[rowIndex][colIndex]}</TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

const ResultDisplay = ({ results, methodName }: { results: MethodResult, methodName: string }) => {
    if (results.error) {
        return <p className="text-destructive">Error in {methodName.toUpperCase()} analysis: {results.error}</p>
    }

    const accuracyPercent = (results.metrics.accuracy * 100).toFixed(2);
    
    return (
        <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Overall Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-4xl font-bold">{accuracyPercent}%</p>
                    <p className="text-sm text-muted-foreground">Overall Classification Accuracy</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle className="font-headline">Confusion Matrix</CardTitle></CardHeader>
                <CardContent>
                    <ConfusionMatrix matrix={results.metrics.confusion_matrix} groups={results.group_means.map((_, i) => `Group ${i+1}`)} />
                </CardContent>
            </Card>

            {results.coefficients && results.intercepts && (
                <Card>
                    <CardHeader><CardTitle className="font-headline">Discriminant Function Coefficients</CardTitle></CardHeader>
                    <CardContent>
                        <ScrollArea className="h-64">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Variable</TableHead>
                                        {results.coefficients.map((_, i) => <TableHead key={i} className="text-right">Function {i+1}</TableHead>)}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.coefficients[0].map((_, varIndex) => (
                                        <TableRow key={varIndex}>
                                            <TableCell>Predictor {varIndex + 1}</TableCell>
                                             {results.coefficients?.map((func, funcIndex) => (
                                                <TableCell key={funcIndex} className="text-right font-mono">{func[varIndex].toFixed(4)}</TableCell>
                                             ))}
                                        </TableRow>
                                    ))}
                                    <TableRow>
                                        <TableCell className="font-bold">Intercept</TableCell>
                                        {results.intercepts.map((intercept, i) => (
                                            <TableCell key={i} className="text-right font-mono font-bold">{intercept.toFixed(4)}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader><CardTitle className="font-headline">Group Means</CardTitle></CardHeader>
                <CardContent>
                     <ScrollArea className="h-64">
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Group</TableHead>
                                    {Array.from({length: results.group_means[0].length}, (_,i) => i+1).map(i => <TableHead key={i} className="text-right">Predictor {i}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.group_means.map((means, groupIndex) => (
                                    <TableRow key={groupIndex}>
                                        <TableCell>Group {groupIndex + 1}</TableCell>
                                        {means.map((mean, i) => (
                                            <TableCell key={i} className="text-right font-mono">{mean.toFixed(3)}</TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    )
}


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
      return data.length > 0 && numericHeaders.length >= 2 && categoricalHeaders.length >= 1;
    }, [data, numericHeaders, categoricalHeaders]);
    
    const handlePredictorSelectionChange = (header: string, checked: boolean) => {
        setPredictorVars(prev => 
        checked ? [...prev, header] : prev.filter(h => h !== header)
        );
    };

    const handleAnalysis = useCallback(async () => {
        if (!groupVar || predictorVars.length < 1) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a group variable and at least one predictor variable.'});
            return;
        };

        setIsLoading(true);
        setAnalysisResult(null);
        
        const backendUrl = '/api/analysis/discriminant';

        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: data,
                    groupVar: groupVar,
                    predictorVars: predictorVars
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();

            if (result.error) {
              throw new Error(result.error);
            }
            setAnalysisResult(result);

        } catch(e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'Analysis Error', description: e.message || 'An unexpected error occurred. Please check the console for details.'})
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
                           To perform this analysis, you need data with at least one categorical group variable and two numeric predictor variables. Try an example dataset.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {discriminantExamples.map((ex) => {
                                const Icon = ex.icon;
                                return (
                                <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                            <Icon className="h-6 w-6 text-secondary-foreground" />
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
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

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
                            <Select value={groupVar} onValueChange={setGroupVar}>
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
                                        <Checkbox
                                        id={`pred-${header}`}
                                        checked={predictorVars.includes(header)}
                                        onCheckedChange={(checked) => handlePredictorSelectionChange(header, checked as boolean)}
                                        />
                                        <label htmlFor={`pred-${header}`} className="text-sm font-medium leading-none">
                                        {header}
                                        </label>
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
                            <Skeleton className="h-96 w-full" />
                        </div>
                    </CardContent>
                </Card>
            )}
            
            {analysisResult ? (
                <Tabs defaultValue="lda" className="w-full">
                    <TabsList>
                        <TabsTrigger value="lda" disabled={!analysisResult.lda || !!analysisResult.lda.error}>Linear (LDA)</TabsTrigger>
                        <TabsTrigger value="qda" disabled={!analysisResult.qda || !!analysisResult.qda.error}>Quadratic (QDA)</TabsTrigger>
                    </TabsList>
                    <TabsContent value="lda" className="mt-4">
                        {analysisResult.lda && <ResultDisplay results={analysisResult.lda} methodName="lda" />}
                    </TabsContent>
                    <TabsContent value="qda" className="mt-4">
                        {analysisResult.qda && <ResultDisplay results={analysisResult.qda} methodName="qda" />}
                    </TabsContent>
                </Tabs>
            ) : (
                 !isLoading && <div className="text-center text-muted-foreground py-10">
                    <Users className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select variables and click 'Run Analysis' to see the results.</p>
                </div>
            )}
        </div>
    );
}
