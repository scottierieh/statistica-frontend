
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, GitBranch } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RandomForestResults {
    accuracy: number;
    classification_report: any;
    confusion_matrix: number[][];
    feature_importance: { [key: string]: number };
    roc_auc_data: {
        auc: number;
    };
    class_names: string[];
}

interface FullAnalysisResponse {
    results: RandomForestResults;
    plot: string;
}

interface RandomForestPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function RandomForestPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: RandomForestPageProps) {
    const { toast } = useToast();
    const [target, setTarget] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    
    // Hyperparameters
    const [nEstimators, setNEstimators] = useState(100);
    const [maxDepth, setMaxDepth] = useState<number | undefined>();
    const [minSamplesSplit, setMinSamplesSplit] = useState(2);
    const [minSamplesLeaf, setMinSamplesLeaf] = useState(1);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length > 1, [data, allHeaders]);

    const targetOptions = useMemo(() => categoricalHeaders, [categoricalHeaders]);
    const featureOptions = useMemo(() => allHeaders.filter(h => h !== target), [allHeaders, target]);

    useEffect(() => {
        const defaultTarget = targetOptions[0];
        setTarget(defaultTarget);
        setFeatures(allHeaders.filter(h => h !== defaultTarget));
        setAnalysisResult(null);
    }, [data, allHeaders, targetOptions]);
    
    const handleFeatureChange = (header: string, checked: boolean) => {
        setFeatures(prev => checked ? [...prev, header] : prev.filter(f => f !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!target || features.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a target and at least one feature.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/random-forest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    target,
                    features,
                    n_estimators: nEstimators,
                    max_depth: maxDepth,
                    min_samples_split: minSamplesSplit,
                    min_samples_leaf: minSamplesLeaf,
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
            console.error('Random Forest Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, target, features, nEstimators, maxDepth, minSamplesSplit, minSamplesLeaf, toast]);
    
    if (!canRun) {
        const rfExample = exampleDatasets.find(ex => ex.id === 'loan-approval');
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Random Forest Classifier</CardTitle>
                        <CardDescription>Upload data with features and a categorical target to get started.</CardDescription>
                    </CardHeader>
                    {rfExample && (
                        <CardContent>
                            <Button onClick={() => onLoadExample(rfExample)} className="w-full" size="sm">
                                <rfExample.icon className="mr-2"/>
                                {rfExample.name}
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
                    <CardTitle className="font-headline">Random Forest Classifier Setup</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Target Variable</Label>
                            <Select value={target} onValueChange={setTarget}>
                                <SelectTrigger><SelectValue placeholder="Select target" /></SelectTrigger>
                                <SelectContent>{targetOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Features</Label>
                            <ScrollArea className="h-24 border rounded-md p-2">
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
                        <CardHeader className='pb-2'><CardTitle className='text-base'>Hyperparameters</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><Label>N Estimators</Label><Input type="number" value={nEstimators} onChange={(e) => setNEstimators(Number(e.target.value))} /></div>
                            <div><Label>Max Depth</Label><Input type="number" placeholder="None" value={maxDepth ?? ''} onChange={(e) => setMaxDepth(e.target.value ? Number(e.target.value) : undefined)} /></div>
                            <div><Label>Min Samples Split</Label><Input type="number" value={minSamplesSplit} onChange={(e) => setMinSamplesSplit(Number(e.target.value))} /></div>
                            <div><Label>Min Samples Leaf</Label><Input type="number" value={minSamplesLeaf} onChange={(e) => setMinSamplesLeaf(Number(e.target.value))} /></div>
                        </CardContent>
                    </Card>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !target || features.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Training...</> : <><Sigma className="mr-2" />Train Model</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[500px] w-full" /></CardContent></Card>}

            {results && analysisResult && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Model Performance</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader><CardTitle>Accuracy</CardTitle></CardHeader>
                                    <CardContent className="text-4xl font-bold">{(results.accuracy * 100).toFixed(2)}%</CardContent>
                                </Card>
                                {results.roc_auc_data?.auc && (
                                     <Card>
                                        <CardHeader><CardTitle>AUC</CardTitle></CardHeader>
                                        <CardContent className="text-4xl font-bold">{results.roc_auc_data.auc.toFixed(4)}</CardContent>
                                    </Card>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Analysis Plots</CardTitle></CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Random Forest Plots" width={1600} height={1200} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Classification Report</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Class</TableHead>
                                        <TableHead className="text-right">Precision</TableHead>
                                        <TableHead className="text-right">Recall</TableHead>
                                        <TableHead className="text-right">F1-Score</TableHead>
                                        <TableHead className="text-right">Support</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(results.classification_report).filter(([key]) => results.class_names.includes(key)).map(([label, metrics]) => (
                                        <TableRow key={label}>
                                            <TableCell>{label}</TableCell>
                                            <TableCell className="text-right font-mono">{(metrics as any).precision.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{(metrics as any).recall.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{(metrics as any)['f1-score'].toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{(metrics as any).support}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
