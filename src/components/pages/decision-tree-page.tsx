
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, GitBranch, Terminal, HelpCircle, MoveRight, Settings, FileSearch, BarChart, Users, CheckCircle, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface DtResults {
    accuracy: number;
    confusion_matrix: number[][];
    class_names: string[];
    interpretation: string;
}

interface FullAnalysisResponse {
    results: DtResults;
    plot: string;
    pruning_plot?: string;
}

interface DecisionTreePageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

const HelpPage = ({ onLoadExample, onBackToSetup }: { onLoadExample: (e: ExampleDataSet) => void, onBackToSetup: () => void }) => {
    const survivalExample = exampleDatasets.find(ex => ex.id === 'survival-churn');
    
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-4xl">
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-3 text-2xl">
                         <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <GitBranch size={28} />
                         </div>
                        Decision Tree Classifier
                    </CardTitle>
                    <CardDescription className="text-base pt-2">
                        A flowchart-like structure where each internal node represents a "test" on an attribute, each branch represents the outcome of the test, and each leaf node represents a class label (a decision). It's intuitive and easy to interpret.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold mb-2">Why Use Decision Trees?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                           Decision trees are excellent for classification problems because they provide clear, interpretable rules. They mimic human decision-making, making it easy to understand why the model made a certain prediction. They can handle both numerical and categorical data and are the fundamental building blocks for more complex models like Random Forests and Gradient Boosting.
                        </p>
                    </div>
                     <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center"><Settings className="mr-2 h-5 w-5 text-primary" />Setup Guide</h3>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                <li><strong>Target Variable:</strong> Select the categorical variable you want to predict (e.g., 'Approved'/'Denied').</li>
                                <li><strong>Feature Variables:</strong> Select the variables (numeric or categorical) that the model will use to make predictions.</li>
                                <li><strong>Random State:</strong> A fixed number to ensure the result is reproducible. The same settings will produce the same tree every time.</li>
                            </ul>
                        </div>
                         <div className="space-y-4">
                            <h3 className="font-semibold text-lg flex items-center"><BarChart className="mr-2 h-5 w-5 text-primary" />Result Interpretation</h3>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                <li><strong>Accuracy:</strong> The percentage of correct predictions. A higher value indicates a better model.</li>
                                <li><strong>Confusion Matrix:</strong> A table showing correct and incorrect predictions for each class, helping you see where the model gets confused.</li>
                                <li><strong>Tree Visualization:</strong> A diagram showing the decision rules. It illustrates how the model splits the data based on feature values to arrive at a final prediction.</li>
                                <li><strong>Accuracy vs. Alpha Plot:</strong> This shows how model accuracy on training and test data changes with the 'alpha' (pruning) parameter, helping to find a good balance between model complexity and performance on new data.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                     {survivalExample && (
                         <Button variant="outline" onClick={() => onLoadExample(survivalExample)}>
                            <TrendingUp className="mr-2 h-4 w-4" /> Load Sample Churn Data
                        </Button>
                     )}
                     <Button onClick={onBackToSetup}>Back to Setup</Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default function DecisionTreePage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: DecisionTreePageProps) {
    const { toast } = useToast();
    const [target, setTarget] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    const [randomState, setRandomState] = useState<number>(42);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showHelpPage, setShowHelpPage] = useState(data.length === 0);

    const binaryCategoricalHeaders = useMemo(() => {
        if (!data || !categoricalHeaders) return [];
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size === 2);
    }, [data, categoricalHeaders]);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length > 1 && binaryCategoricalHeaders.length > 0, [data, allHeaders, binaryCategoricalHeaders]);
    
    const survivalExample = exampleDatasets.find(ex => ex.id === 'survival-churn');

    useEffect(() => {
        if (!canRun) {
            if (survivalExample) {
                onLoadExample(survivalExample);
                setShowHelpPage(false);
            } else {
                 setShowHelpPage(true);
            }
        } else {
            const defaultTarget = binaryCategoricalHeaders.find(h => h.toLowerCase().includes('status') || h.toLowerCase().includes('churn') || h.toLowerCase().includes('approved')) || binaryCategoricalHeaders[0];
            setTarget(defaultTarget);
            setFeatures(allHeaders.filter(h => h !== defaultTarget));
            setAnalysisResult(null);
            setShowHelpPage(false);
        }
    }, [data, allHeaders, numericHeaders, binaryCategoricalHeaders, canRun, survivalExample, onLoadExample]);


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
            const response = await fetch('/api/analysis/decision-tree-classifier', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    target, 
                    features,
                    random_state: randomState,
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Decision Tree error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, target, features, randomState, toast]);
    
    const availableFeatures = useMemo(() => {
        return allHeaders.filter(h => h !== target);
    }, [allHeaders, target]);
    
    if (showHelpPage) {
        return <HelpPage onLoadExample={onLoadExample} onBackToSetup={() => setShowHelpPage(false)} />
    }
    
    const results = analysisResult?.results;

    const performanceMetrics = useMemo(() => {
        if (!results || !results.confusion_matrix || results.confusion_matrix.length !== 2) return null;
        const [tn, fp, fn, tp] = results.confusion_matrix.flat();
        const sensitivity = tp / (tp + fn);
        const specificity = tn / (tn + fp);
        const ppv = tp / (tp + fp);
        const npv = tn / (tn + fn);

        let interpretation = `The model achieved an accuracy of <strong>${(results.accuracy * 100).toFixed(1)}%</strong>. `;
        interpretation += `It correctly identifies <strong>${(sensitivity * 100).toFixed(1)}%</strong> of positive cases (Sensitivity/Recall) and <strong>${(specificity * 100).toFixed(1)}%</strong> of negative cases (Specificity).`;
        
        return {
            sensitivity, specificity, ppv, npv, interpretation
        }
    }, [results]);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <CardTitle className="font-headline">Decision Tree Classifier Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setShowHelpPage(true)}><HelpCircle className="h-4 w-4" /></Button>
                    </div>
                     <CardDescription>
                        Select your target variable (Y), feature variable(s) (X), and configure the model parameters.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Target Variable (Binary)</Label>
                            <Select value={target} onValueChange={setTarget}>
                                <SelectTrigger><SelectValue placeholder="Select target"/></SelectTrigger>
                                <SelectContent>{binaryCategoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Features</Label>
                            <ScrollArea className="h-24 border rounded-md p-2">
                                {availableFeatures.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`feat-${h}`} checked={features.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                        <Label htmlFor={`feat-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                    <div>
                        <Label>Random State</Label>
                        <Input type="number" value={randomState} onChange={e => setRandomState(Number(e.target.value))} />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !target || features.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Training...</> : <><Sigma className="mr-2"/>Train Model</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-[500px] w-full"/></CardContent></Card>}

            {analysisResult && results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Model Performance</CardTitle>
                        </CardHeader>
                         <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Accuracy</p><p className="text-3xl font-bold">{(results.accuracy * 100).toFixed(1)}%</p></div>
                                {performanceMetrics && <>
                                    <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Sensitivity</p><p className="text-3xl font-bold">{(performanceMetrics.sensitivity * 100).toFixed(1)}%</p></div>
                                    <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Specificity</p><p className="text-3xl font-bold">{(performanceMetrics.specificity * 100).toFixed(1)}%</p></div>
                                    <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Precision (PPV)</p><p className="text-3xl font-bold">{(performanceMetrics.ppv * 100).toFixed(1)}%</p></div>
                                </>}
                            </div>
                             {performanceMetrics?.interpretation && (
                                <Alert className="mt-4">
                                  <AlertTitle>Summary</AlertTitle>
                                  <AlertDescription dangerouslySetInnerHTML={{ __html: performanceMetrics.interpretation }} />
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle>Confusion Matrix</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead></TableHead>
                                            {results.class_names.map(name => <TableHead key={name} className="text-center">Predicted {name}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.class_names.map((name, i) => (
                                            <TableRow key={name}>
                                                <TableHead>Actual {name}</TableHead>
                                                {results.confusion_matrix[i].map((val, j) => (
                                                    <TableCell key={j} className="text-center font-mono">{val}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                         {analysisResult.pruning_plot && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Accuracy vs. Pruning (Alpha)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Image src={analysisResult.pruning_plot} alt="Accuracy vs Alpha Plot" width={1000} height={600} className="w-full rounded-md border"/>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                     {analysisResult.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Decision Tree Visualization</CardTitle>
                                <CardDescription dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/```[\s\S]*?```/g, '') }} />
                            </CardHeader>
                            <CardContent>
                                <Image src={analysisResult.plot} alt="Decision Tree Plot" width={1200} height={800} className="w-full rounded-md border"/>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
