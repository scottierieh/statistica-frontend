
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, GitBranch, Terminal, HelpCircle, MoveRight, Settings, FileSearch, BarChart, Users } from 'lucide-react';
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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: ExampleDataSet) => void }) => {
    const rfExample = exampleDatasets.find(d => d.id === 'loan-approval');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                     <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <GitBranch size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Random Forest Classifier</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        A powerful ensemble learning method that builds multiple decision trees for robust and accurate classification.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Random Forest?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Random Forest is a highly versatile and powerful machine learning algorithm. It operates by constructing a multitude of decision trees during training and outputting the class that is the mode of the classes of the individual trees. It is effective for high-dimensional data, less prone to overfitting than a single decision tree, and provides a reliable estimate of feature importance.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {rfExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(rfExample)}>
                                <rfExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{rfExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{rfExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Target Variable:</strong> Select the categorical variable you want to predict (e.g., 'Loan Status').</li>
                                <li><strong>Feature Variables:</strong> Choose the variables (numeric or categorical) that the model will use to make predictions.</li>
                                <li><strong>Hyperparameters:</strong> Adjust settings like the number of trees (N Estimators) and their depth to fine-tune the model.</li>
                                <li><strong>Train Model:</strong> The algorithm will train a forest of decision trees and evaluate its performance.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Accuracy & AUC:</strong> These metrics measure the model's overall predictive power. Higher values are better.
                                </li>
                                 <li>
                                    <strong>Feature Importance:</strong> Ranks which predictors were most influential in the model's decisions. This is key for understanding what drives the outcome.
                                </li>
                                <li>
                                    <strong>Confusion Matrix:</strong> Shows the number of correct and incorrect predictions for each class, helping you see where the model is succeeding or failing.
                                </li>
                                <li>
                                    <strong>ROC Curve:</strong> Visualizes the trade-off between true positive rate and false positive rate. A curve closer to the top-left corner indicates better performance.
                                </li>
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
    const [view, setView] = useState('intro');

    const canRun = useMemo(() => data.length > 0 && allHeaders.length > 1, [data, allHeaders]);
    const targetOptions = useMemo(() => categoricalHeaders, [categoricalHeaders]);
    const featureOptions = useMemo(() => allHeaders.filter(h => h !== target), [allHeaders, target]);

    useEffect(() => {
        const defaultTarget = targetOptions[0];
        setTarget(defaultTarget);
        setFeatures(allHeaders.filter(h => h !== defaultTarget));
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, allHeaders, targetOptions, canRun]);
    
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
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CardTitle className="font-headline">Random Forest Classifier Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-4 h-4" /></Button>
                    </div>
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
                            <Image src={`data:image/png;base64,${analysisResult.plot}`} alt="Random Forest Plots" width={1600} height={1200} className="w-full rounded-md border"/>
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
