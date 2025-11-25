'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, GitBranch, Terminal, HelpCircle, Settings, FileSearch, BarChart, Users, BrainCircuit, CheckCircle, TrendingUp, BookOpen, Target, Lightbulb } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Input } from '../ui/input';

interface GbmResults {
    metrics: any;
    feature_importance: { [key: string]: number };
    prediction_examples: any[];
    interpretation?: string;
}

interface FullAnalysisResponse {
    results: GbmResults;
    plot: string;
}

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const gbmExample = exampleDatasets.find(d => d.id === 'gbm-regression');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <BrainCircuit className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Gradient Boosting Machine</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Build powerful ensemble models that combine multiple decision trees for superior predictions
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Sequential Learning</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Each tree learns from the mistakes of previous trees, progressively improving predictions
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">High Accuracy</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Often outperforms other algorithms through gradient-based optimization
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Settings className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Flexible</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Works for both regression and classification with tunable hyperparameters
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            GBM builds an ensemble of trees sequentially, where each new tree focuses on correcting 
                            the errors made by previous trees. This gradient descent optimization in function space 
                            creates highly accurate models that often outperform other algorithms.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Required Setup
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Problem type:</strong> Regression or classification</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Target variable:</strong> Outcome to predict</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Features:</strong> Predictor variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Hyperparameters:</strong> Model tuning parameters</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Metrics:</strong> R² and RMSE for regression, accuracy for classification</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Feature importance:</strong> Which variables matter most</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Learning curves:</strong> Model performance over iterations</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {gbmExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(gbmExample)} size="lg">
                                <TrendingUp className="mr-2" />
                                Load Sample Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const PredictionExamplesTable = ({ examples, problemType }: { examples: any[], problemType: 'regression' | 'classification' }) => {
    if (!examples || examples.length === 0) return null;
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-5 h-5" />
                    Prediction Examples
                </CardTitle>
                <CardDescription>A random sample of 10 predictions from the test set</CardDescription>
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

// Overview Component
const GbmOverview = ({ target, features, problemType, dataLength, nEstimators, learningRate, maxDepth, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        if (target && features.length > 0) {
            overview.push(`Predicting ${target} using ${features.length} predictor${features.length > 1 ? 's' : ''}`);
            overview.push(`Model type: Gradient Boosting ${problemType === 'regression' ? 'Regressor' : 'Classifier'}`);
        } else if (target) {
            overview.push(`Predicting ${target} (no predictors selected)`);
        } else {
            overview.push('Select target variable and predictors');
        }

        if (dataLength < 50) {
            overview.push(`Sample size: ${dataLength} (⚠ Small - results may be unstable)`);
        } else if (dataLength < 100) {
            overview.push(`Sample size: ${dataLength} (Moderate)`);
        } else {
            overview.push(`Sample size: ${dataLength} (Good)`);
        }
        
        const isMissing = (value: any) => {
            return value == null || value === '' || 
                   (typeof value === 'number' && isNaN(value)) ||
                   (typeof value === 'string' && value.toLowerCase() === 'nan');
        };
        
        if (data && data.length > 0 && target && features.length > 0) {
            const allVars = [target, ...features];
            const missingCount = data.filter((row: any) => 
                allVars.some(v => isMissing(row[v]))
            ).length;
            const validCount = dataLength - missingCount;
            
            if (missingCount > 0) {
                overview.push(`⚠ Missing values: ${missingCount} rows excluded (${validCount} valid)`);
            } else {
                overview.push(`No missing values detected in selected variables`);
            }
        }
        
        overview.push(`Ensemble size: ${nEstimators} sequential trees`);
        overview.push(`Learning rate: ${learningRate} (shrinkage factor)`);
        overview.push(`Maximum tree depth: ${maxDepth} levels`);
        overview.push('Training method: Gradient descent on loss function');
        overview.push('Validation: Train/test split (80/20)');

        return overview;
    }, [target, features, problemType, dataLength, nEstimators, learningRate, maxDepth, data]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Overview</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                    {items.map((item, idx) => (
                        <li key={idx} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};

// Parse interpretation into sections
const parseInterpretation = (interpretation: string) => {
    const sections: { title: string; content: string[]; icon: any }[] = [];
    if (!interpretation) return sections;
    
    const lines = interpretation.split('\n').filter(l => l.trim());
    let currentSection: typeof sections[0] | null = null;

    lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
            const title = trimmed.replace(/\*\*/g, '').trim();
            let icon = Users;
            if (title.toLowerCase().includes('overall')) icon = Users;
            else if (title.toLowerCase().includes('statistical') || title.toLowerCase().includes('insights')) icon = Lightbulb;
            else if (title.toLowerCase().includes('recommend')) icon = BookOpen;
            
            currentSection = { title, content: [], icon };
            sections.push(currentSection);
        } else if (currentSection && trimmed) {
            currentSection.content.push(trimmed);
        }
    });

    return sections;
};

interface GbmPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function GbmPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: GbmPageProps) {
    const { toast } = useToast();
    const [showIntro, setShowIntro] = useState(data.length === 0);
    const [problemType, setProblemType] = useState<'regression' | 'classification'>('regression');
    const [target, setTarget] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    
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
        setShowIntro(data.length === 0);

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
    }, [data, allHeaders, problemType, numericHeaders, binaryCategoricalHeaders, target]);
    
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
        setShowIntro(false);
    }

    if (showIntro || !canRun) {
        return <IntroPage onLoadExample={handleLoadExample} />;
    }
    
    const results = analysisResult?.results;
    const interpretationSections = results?.interpretation ? parseInterpretation(results.interpretation) : [];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="font-headline">Model Configuration</CardTitle>
                            <CardDescription>
                                Configure your GBM model parameters and hyperparameters
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowIntro(true)}>
                            <HelpCircle className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Problem Type</Label>
                            <Select value={problemType} onValueChange={(v) => setProblemType(v as any)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="regression">Regression</SelectItem>
                                    <SelectItem value="classification">Classification</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Target Variable</Label>
                            <Select value={target} onValueChange={setTarget}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select target" />
                                </SelectTrigger>
                                <SelectContent>
                                    {targetOptions.map(h => (
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Features</Label>
                            <ScrollArea className="h-24 border rounded-md p-2">
                                {featureOptions.map(h => (
                                    <div key={h} className="flex items-center space-x-2 mb-1">
                                        <Checkbox 
                                            id={`feat-${h}`} 
                                            checked={features.includes(h)} 
                                            onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} 
                                        />
                                        <Label htmlFor={`feat-${h}`} className="text-sm font-normal cursor-pointer">{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Number of Estimators</Label>
                            <Input 
                                type="number" 
                                value={nEstimators} 
                                onChange={(e) => setNEstimators(Number(e.target.value))} 
                            />
                        </div>
                        <div>
                            <Label>Learning Rate</Label>
                            <Input 
                                type="number" 
                                value={learningRate} 
                                step="0.01" 
                                onChange={(e) => setLearningRate(Number(e.target.value))} 
                            />
                        </div>
                        <div>
                            <Label>Max Depth</Label>
                            <Input 
                                type="number" 
                                value={maxDepth} 
                                onChange={(e) => setMaxDepth(Number(e.target.value))} 
                            />
                        </div>
                    </div>

                    {target && features.length > 0 && (
                        <GbmOverview
                            target={target}
                            features={features}
                            problemType={problemType}
                            dataLength={data.length}
                            nEstimators={nEstimators}
                            learningRate={learningRate}
                            maxDepth={maxDepth}
                            data={data}
                        />
                    )}
                </CardContent>

                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !target || features.length === 0} size="lg">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Training Model...
                            </>
                        ) : (
                            <>
                                <Sigma className="mr-2 h-4 w-4" />
                                Train GBM Model
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-96 w-full" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {results && analysisResult && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {problemType === 'regression' ? (
                            <>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">R-squared (R²)</p>
                                                <Target className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{results.metrics.r2_score.toFixed(4)}</p>
                                            <p className="text-xs text-muted-foreground">Variance explained</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">MSE</p>
                                                <BarChart className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{results.metrics.mse.toFixed(2)}</p>
                                            <p className="text-xs text-muted-foreground">Mean squared error</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">RMSE</p>
                                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{results.metrics.rmse.toFixed(2)}</p>
                                            <p className="text-xs text-muted-foreground">Root mean squared error</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Trees Built</p>
                                                <GitBranch className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{nEstimators}</p>
                                            <p className="text-xs text-muted-foreground">Sequential ensemble</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        ) : (
                            <>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Overall Accuracy</p>
                                                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{(results.metrics.accuracy * 100).toFixed(1)}%</p>
                                            <p className="text-xs text-muted-foreground">Correct predictions</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                {results.metrics.classification_report && (
                                    <>
                                        <Card>
                                            <CardContent className="p-6">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-medium text-muted-foreground">Avg Precision</p>
                                                        <Target className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                    <p className="text-2xl font-semibold">
                                                        {(Object.keys(results.metrics.classification_report)
                                                            .filter(k => k !== 'accuracy' && k !== 'macro avg' && k !== 'weighted avg')
                                                            .reduce((sum, k) => sum + results.metrics.classification_report[k].precision, 0) / 
                                                            Object.keys(results.metrics.classification_report).filter(k => k !== 'accuracy' && k !== 'macro avg' && k !== 'weighted avg').length * 100).toFixed(1)}%
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">Positive predictive value</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardContent className="p-6">
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-medium text-muted-foreground">Avg Recall</p>
                                                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                                    </div>
                                                    <p className="text-2xl font-semibold">
                                                        {(Object.keys(results.metrics.classification_report)
                                                            .filter(k => k !== 'accuracy' && k !== 'macro avg' && k !== 'weighted avg')
                                                            .reduce((sum, k) => sum + results.metrics.classification_report[k].recall, 0) / 
                                                            Object.keys(results.metrics.classification_report).filter(k => k !== 'accuracy' && k !== 'macro avg' && k !== 'weighted avg').length * 100).toFixed(1)}%
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">True positive rate</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Trees Built</p>
                                                <GitBranch className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{nEstimators}</p>
                                            <p className="text-xs text-muted-foreground">Gradient boosting</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>

                    {/* Detailed Analysis Section */}
                    {interpretationSections.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Detailed Analysis</CardTitle>
                                <CardDescription>Comprehensive interpretation of GBM results</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4">
                                    {interpretationSections.map((section, idx) => {
                                        const IconComponent = section.icon;
                                        const colorClasses = idx === 0 
                                            ? 'bg-gradient-to-r from-primary/5 to-primary/10 border-primary/40'
                                            : idx === 1
                                            ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-300 dark:border-blue-700'
                                            : 'bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700';
                                        
                                        const iconBgClasses = idx === 0
                                            ? 'bg-primary/20 text-primary'
                                            : idx === 1
                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
                                        
                                        const bulletColor = idx === 0
                                            ? 'text-primary'
                                            : idx === 1
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-amber-600 dark:text-amber-400';

                                        return (
                                            <div 
                                                key={idx} 
                                                className={`rounded-xl border-2 p-5 ${colorClasses}`}
                                            >
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className={`p-2 rounded-lg ${iconBgClasses}`}>
                                                        <IconComponent className="h-5 w-5" />
                                                    </div>
                                                    <h3 className="font-semibold text-base">{section.title}</h3>
                                                </div>
                                                <div className="space-y-2.5 text-sm">
                                                    {section.content.map((line, lineIdx) => {
                                                        const isArrow = line.startsWith('→');
                                                        const isBullet = line.startsWith('•');
                                                        const content = line.replace(/^[→•]\s*/, '');
                                                        
                                                        return (
                                                            <div 
                                                                key={lineIdx} 
                                                                className={`flex items-start gap-2 ${isBullet ? 'ml-4' : ''}`}
                                                            >
                                                                <span className={`${bulletColor} flex-shrink-0 mt-0.5`}>
                                                                    {isArrow ? '→' : isBullet ? '•' : '→'}
                                                                </span>
                                                                <span 
                                                                    className="text-muted-foreground leading-relaxed"
                                                                    dangerouslySetInnerHTML={{ 
                                                                        __html: content
                                                                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                                                                    }}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Analysis Plots */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Plots</CardTitle>
                            <CardDescription>Feature importance and learning curves</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image 
                                src={analysisResult.plot} 
                                alt="GBM Analysis Plots" 
                                width={1800} 
                                height={1500} 
                                className="w-full rounded-md border"
                            />
                        </CardContent>
                    </Card>

                    {/* Prediction Examples */}
                    <PredictionExamplesTable examples={results.prediction_examples} problemType={problemType} />
                </div>
            )}
        </div>
    );
}
