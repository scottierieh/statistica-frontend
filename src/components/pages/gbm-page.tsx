
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, GitBranch, Terminal, HelpCircle, MoveRight, Settings, FileSearch, BarChart, Users, BrainCircuit } from 'lucide-react';
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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: ExampleDataSet) => void }) => {
    const gbmExample = exampleDatasets.find(d => d.id === 'gbm-regression');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <BrainCircuit size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Gradient Boosting Machine (GBM)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        A powerful machine learning technique that builds an ensemble of decision trees sequentially to make highly accurate predictions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use GBM?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Gradient Boosting is an advanced ensemble method that creates a strong predictive model by combining multiple "weak" decision trees. Unlike Random Forest, which builds trees independently, GBM builds them one by one, where each new tree focuses on correcting the errors made by the previous ones. This sequential learning process often leads to higher accuracy, making it a popular choice for both regression and classification tasks.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {gbmExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(gbmExample)}>
                                <gbmExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{gbmExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{gbmExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Problem Type:</strong> Choose between 'Regression' (for continuous outcomes like price) and 'Classification' (for categorical outcomes like 'yes'/'no').</li>
                                <li><strong>Target & Features:</strong> Select the outcome variable to predict and the features to use for prediction.</li>
                                <li><strong>Hyperparameters:</strong> Adjust parameters like 'Number of Estimators' (trees), 'Learning Rate', and 'Max Depth' to control model complexity and prevent overfitting.</li>
                                <li><strong>Train Model:</strong> Build and evaluate the GBM model.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Performance Metrics:</strong> For regression, R-squared and RMSE indicate model fit and error size. For classification, accuracy and the confusion matrix show predictive power.</li>
                                <li><strong>Feature Importance:</strong> Identifies which variables had the most influence on the model's predictions, helping you understand key drivers.</li>
                                <li><strong>Learning Curve:</strong> This plot shows how model error changes as more trees are added. Ideally, the test error should decrease and then plateau. An increasing test error suggests overfitting.</li>
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
    const [view, setView] = useState('intro');
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
        setAnalysisResult(null);
        setIsLoading(false);
        const canActuallyRun = data.length > 0 && allHeaders.length > 1;
        setView(canActuallyRun ? 'main' : 'intro');

        const newTargetOptions = problemType === 'regression' ? numericHeaders : binaryCategoricalHeaders;
        let defaultTarget = newTargetOptions.find(h => h === target);
        if (!defaultTarget) {
            defaultTarget = newTargetOptions[0];
        }
        setTarget(defaultTarget);
        
        if (defaultTarget) {
            setFeatures(allHeaders.filter(h => h !== defaultTarget));
        } else {
            setFeatures([]);
        }

    }, [data, allHeaders, problemType]);
    
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

    const handleLoadExample = (example: ExampleDataSet) => {
        onLoadExample(example);
        if (example.id.includes('regression')) {
            setProblemType('regression');
        } else {
            setProblemType('classification');
        }
    }

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExample} />;
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
                    <div className="flex items-center gap-2">
                        <CardTitle className="font-headline">Gradient Boosting Machine (GBM)</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-4 h-4" /></Button>
                    </div>
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
                        <CardHeader className='pb-2'><CardTitle className='text-base'>Hyperparameters</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
