
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, GitBranch, Terminal } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '../ui/input';

interface GbmResults {
    metrics: any;
    feature_importance: { [key: string]: number };
    prediction_examples: any[];
}

interface FullAnalysisResponse {
    results: GbmResults;
    plot: string;
}

const PredictionExamplesTable = ({ examples, problemType }: { examples: any[], problemType: 'regression' | 'classification' }) => {
    if (!examples || examples.length === 0) return null;
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Terminal/> Prediction Examples</CardTitle>
                <CardDescription>A random sample of 10 predictions from the test set.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            {problemType === 'regression' ? (
                                <>
                                    <TableHead>Actual</TableHead>
                                    <TableHead>Predicted</TableHead>
                                    <TableHead>Error</TableHead>
                                    <TableHead>Error %</TableHead>
                                </>
                            ) : (
                                <>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actual</TableHead>
                                    <TableHead>Predicted</TableHead>
                                    <TableHead>Confidence</TableHead>
                                </>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {examples.map((ex, i) => (
                            <TableRow key={i}>
                                {problemType === 'regression' ? (
                                    <>
                                        <TableCell>{ex.actual.toFixed(2)}</TableCell>
                                        <TableCell>{ex.predicted.toFixed(2)}</TableCell>
                                        <TableCell>{ex.error.toFixed(2)}</TableCell>
                                        <TableCell>{ex.error_percent.toFixed(2)}%</TableCell>
                                    </>
                                ) : (
                                    <>
                                        <TableCell>{ex.status}</TableCell>
                                        <TableCell>{ex.actual}</TableCell>
                                        <TableCell>{ex.predicted}</TableCell>
                                        <TableCell>{(ex.confidence * 100).toFixed(1)}%</TableCell>
                                    </>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

interface GbmPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function GbmPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: GbmPageProps) {
    const { toast } = useToast();
    const [problemType, setProblemType] = useState<'regression' | 'classification'>('regression');
    const [target, setTarget] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    
    // Hyperparameters
    const [nEstimators, setNEstimators] = useState(100);
    const [learningRate, setLearningRate] = useState(0.1);
    const [maxDepth, setMaxDepth] = useState(3);

    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length > 1, [data, allHeaders]);
    
    const binaryCategoricalHeaders = useMemo(() => {
        return allHeaders.filter(h => {
            const uniqueValues = new Set(data.map(row => row[h]).filter(v => v != null && v !== ''));
            return uniqueValues.size === 2;
        });
    }, [data, allHeaders]);

    const targetOptions = useMemo(() => {
        return problemType === 'regression' ? numericHeaders : binaryCategoricalHeaders;
    }, [problemType, numericHeaders, binaryCategoricalHeaders]);

    useEffect(() => {
        // This effect runs only when data or the headers change (i.e., new file loaded)
        setAnalysisResult(null);
        setIsLoading(false);
        
        const newTargetOptions = problemType === 'regression' ? numericHeaders : binaryCategoricalHeaders;
        const defaultTarget = newTargetOptions.find(h => h === target) || newTargetOptions[0];
        setTarget(defaultTarget);

    }, [data, allHeaders]); // Removed headers from deps to avoid re-triggering on type change

    useEffect(() => {
        // This effect runs only when problemType changes
        setAnalysisResult(null);
        const newTargetOptions = problemType === 'regression' ? numericHeaders : binaryCategoricalHeaders;
        // If the current target is not valid for the new problem type, update it.
        if (!target || !newTargetOptions.includes(target)) {
            setTarget(newTargetOptions[0]);
        }
    }, [problemType, target, numericHeaders, binaryCategoricalHeaders]);
    
    useEffect(() => {
        // Update features whenever the target variable changes
        if (target) {
            setFeatures(allHeaders.filter(h => h !== target));
        } else {
            setFeatures([]);
        }
    }, [target, allHeaders]);

    const handleFeatureChange = (header: string, checked: boolean) => {
        setFeatures(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!target || features.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a target and at least one feature.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/gbm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    target,
                    features,
                    problemType,
                    nEstimators,
                    learningRate,
                    maxDepth
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('GBM Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, target, features, problemType, nEstimators, learningRate, maxDepth, toast]);
    
    const featureOptions = useMemo(() => {
        return allHeaders.filter(h => h !== target);
    }, [allHeaders, target]);

    if (!canRun) {
        const gbmExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('gbm'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Gradient Boosting Machine (GBM)</CardTitle>
                        <CardDescription>Upload data with features and a target variable to get started.</CardDescription>
                    </CardHeader>
                     {gbmExamples.length > 0 && (
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {gbmExamples.map((ex) => {
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
                                        <CardFooter>
                                            <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                                Load this data
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                    )
                                })}
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>
        );
    }

    const results = analysisResult?.results;
    
    const renderClassificationMetrics = () => {
        if (!results || problemType !== 'classification') return null;
        const report = results.metrics.classification_report;
        const labels = Object.keys(report).filter(k => k !== 'accuracy' && k !== 'macro avg' && k !== 'weighted avg');
        return (
            <div className="grid grid-cols-2 gap-4">
                 <Card>
                    <CardHeader><CardTitle>Classification Report</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Class</TableHead>
                                    <TableHead className='text-right'>Precision</TableHead>
                                    <TableHead className='text-right'>Recall</TableHead>
                                    <TableHead className='text-right'>F1-Score</TableHead>
                                    <TableHead className='text-right'>Support</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {labels.map(label => (
                                    <TableRow key={label}>
                                        <TableCell>{label}</TableCell>
                                        <TableCell className='text-right font-mono'>{report[label].precision.toFixed(3)}</TableCell>
                                        <TableCell className='text-right font-mono'>{report[label].recall.toFixed(3)}</TableCell>
                                        <TableCell className='text-right font-mono'>{report[label]['f1-score'].toFixed(3)}</TableCell>
                                        <TableCell className='text-right font-mono'>{report[label].support}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Overall Accuracy</CardTitle></CardHeader>
                    <CardContent className="text-center">
                        <p className="text-4xl font-bold">{(results.metrics.accuracy * 100).toFixed(2)}%</p>
                    </CardContent>
                </Card>
            </div>
        )
    };

    const renderRegressionMetrics = () => {
         if (!results || problemType !== 'regression') return null;
         return (
             <div className="grid md:grid-cols-3 gap-4">
                 <Card>
                    <CardHeader><CardTitle>R-squared</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">{results.metrics.r2_score.toFixed(4)}</p></CardContent>
                 </Card>
                 <Card>
                    <CardHeader><CardTitle>Mean Squared Error (MSE)</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">{results.metrics.mse.toFixed(2)}</p></CardContent>
                 </Card>
                 <Card>
                    <CardHeader><CardTitle>Root Mean Squared Error (RMSE)</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">{results.metrics.rmse.toFixed(2)}</p></CardContent>
                 </Card>
             </div>
         )
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Gradient Boosting Machine (GBM)</CardTitle>
                    <CardDescription>Configure and run a GBM model for regression or classification.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Problem Type</Label>
                            <Select value={problemType} onValueChange={(v) => setProblemType(v as any)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="regression">Regression</SelectItem>
                                    <SelectItem value="classification">Classification</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Target Variable</Label>
                            <Select value={target} onValueChange={setTarget}>
                                <SelectTrigger><SelectValue placeholder="Select target" /></SelectTrigger>
                                <SelectContent>{targetOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                         <div>
                            <Label>Features</Label>
                            <ScrollArea className="h-32 border rounded-md p-2">
                                {featureOptions.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`feat-${h}`} checked={features.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                        <Label htmlFor={`feat-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                     <Card>
                        <CardHeader><CardTitle className='text-base'>Hyperparameters</CardTitle></CardHeader>
                        <CardContent className="grid md:grid-cols-3 gap-4">
                            <div><Label>Number of Estimators</Label><Input type="number" value={nEstimators} onChange={(e) => setNEstimators(Number(e.target.value))} /></div>
                            <div><Label>Learning Rate</Label><Input type="number" value={learningRate} step="0.01" onChange={(e) => setLearningRate(Number(e.target.value))} /></div>
                            <div><Label>Max Depth</Label><Input type="number" value={maxDepth} onChange={(e) => setMaxDepth(Number(e.target.value))} /></div>
                        </CardContent>
                    </Card>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !target || features.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2" />Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[500px] w-full" /></CardContent></Card>}

            {results && analysisResult && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle className="font-headline">Analysis Results</CardTitle></CardHeader>
                        <CardContent>
                            {problemType === 'regression' ? renderRegressionMetrics() : renderClassificationMetrics()}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Plots</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Image src={analysisResult.plot} alt="GBM Analysis Plots" width={1800} height={1500} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>
                    <PredictionExamplesTable examples={results.prediction_examples} problemType={problemType} />
                </div>
            )}
        </div>
    );
}
