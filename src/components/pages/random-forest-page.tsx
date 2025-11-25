'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Trees, HelpCircle, Settings, FileSearch, BarChart, Users, CheckCircle, TrendingUp, BookOpen, Target, Lightbulb } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RandomForestResults {
    accuracy: number;
    nir: number;
    classification_report: any;
    confusion_matrix: number[][];
    feature_importance: { [key: string]: number };
    roc_auc_data: {
        auc: number;
    };
    class_names: string[];
    interpretation?: string;
}

interface FullAnalysisResponse {
    results: RandomForestResults;
    plot: string;
}

// Overview component
const RFOverview = ({ target, features, dataLength, nEstimators, maxDepth, minSamplesSplit, minSamplesLeaf }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        if (target && features.length > 0) {
            overview.push(`Predicting ${target} using ${features.length} predictor${features.length > 1 ? 's' : ''}`);
            overview.push(`Ensemble of ${nEstimators} decision trees`);
        } else if (target) {
            overview.push(`Predicting ${target} (no predictors selected)`);
        } else {
            overview.push('Select target variable and predictors');
        }

        if (dataLength < 30) {
            overview.push(`Sample size: ${dataLength} (⚠ Very small - results unreliable)`);
        } else if (dataLength < 100) {
            overview.push(`Sample size: ${dataLength} (Small - use with caution)`);
        } else {
            overview.push(`Sample size: ${dataLength} (Adequate)`);
        }
        
        if (maxDepth) {
            overview.push(`Maximum tree depth: ${maxDepth} levels`);
        } else {
            overview.push('Maximum tree depth: Unlimited (trees fully grown)');
        }
        
        overview.push(`Min samples to split: ${minSamplesSplit}, Min samples per leaf: ${minSamplesLeaf}`);
        overview.push('Bootstrap sampling: Enabled (random subsets)');
        overview.push('Feature randomization: Square root of features per split');
        overview.push('Output: Class probabilities averaged across trees');

        return overview;
    }, [target, features, dataLength, nEstimators, maxDepth, minSamplesSplit, minSamplesLeaf]);

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

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const rfExample = exampleDatasets.find(d => d.id === 'survival-churn');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Trees className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Random Forest Classifier</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Build robust ensemble models using multiple decision trees for accurate classification
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Trees className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Ensemble Power</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Combines predictions from multiple decision trees to improve accuracy and reduce overfitting
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Feature Insights</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Automatically ranks which variables are most important for predictions
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <CheckCircle className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Robust & Stable</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Handles high-dimensional data well and is less prone to overfitting than single trees
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
                            Random Forest constructs multiple decision trees during training and outputs the class that 
                            is the mode of the classes from individual trees. Each tree is trained on a random subset 
                            of the data and features, creating diversity that leads to better generalization.
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
                                        <span><strong>Target variable:</strong> Binary categorical variable to predict</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Features:</strong> Predictor variables (numeric or categorical)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Hyperparameters:</strong> Number of trees, max depth, etc.</span>
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
                                        <span><strong>Accuracy & AUC:</strong> Overall predictive performance metrics</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Feature importance:</strong> Which variables drive predictions</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>ROC curve:</strong> Visualization of model performance</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {rfExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(rfExample)} size="lg">
                                <Trees className="mr-2 h-5 w-5" />
                                Load Loan Approval Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
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

interface RandomForestPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function RandomForestPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: RandomForestPageProps) {
    const { toast } = useToast();
    const [showIntro, setShowIntro] = useState(data.length === 0);
    const [target, setTarget] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    
    const [nEstimators, setNEstimators] = useState(100);
    const [maxDepth, setMaxDepth] = useState<number | undefined>();
    const [minSamplesSplit, setMinSamplesSplit] = useState(2);
    const [minSamplesLeaf, setMinSamplesLeaf] = useState(1);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length > 1, [data, allHeaders]);
    
    const binaryCategoricalHeaders = useMemo(() => {
        return categoricalHeaders.filter(h => new Set(data.map(row => row[h])).size === 2);
    }, [data, categoricalHeaders]);
    
    const targetOptions = useMemo(() => binaryCategoricalHeaders, [binaryCategoricalHeaders]);
    const featureOptions = useMemo(() => allHeaders.filter(h => h !== target), [allHeaders, target]);

    useEffect(() => {
        const defaultTarget = targetOptions[0];
        setTarget(defaultTarget);
        setFeatures(allHeaders.filter(h => h !== defaultTarget));
        setAnalysisResult(null);
        setShowIntro(data.length === 0 || targetOptions.length === 0);
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
    
    if (showIntro || !canRun || targetOptions.length === 0) {
        return <IntroPage onLoadExample={onLoadExample} />;
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
                                Configure your Random Forest model parameters and hyperparameters
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowIntro(true)}>
                            <HelpCircle className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Target Variable (Binary)</Label>
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
                    
                    <div className="grid md:grid-cols-4 gap-4">
                        <div>
                            <Label>N Estimators</Label>
                            <Input 
                                type="number" 
                                value={nEstimators} 
                                onChange={(e) => setNEstimators(Number(e.target.value))} 
                            />
                        </div>
                        <div>
                            <Label>Max Depth</Label>
                            <Input 
                                type="number" 
                                placeholder="None" 
                                value={maxDepth ?? ''} 
                                onChange={(e) => setMaxDepth(e.target.value ? Number(e.target.value) : undefined)} 
                            />
                        </div>
                        <div>
                            <Label>Min Samples Split</Label>
                            <Input 
                                type="number" 
                                value={minSamplesSplit} 
                                onChange={(e) => setMinSamplesSplit(Number(e.target.value))} 
                            />
                        </div>
                        <div>
                            <Label>Min Samples Leaf</Label>
                            <Input 
                                type="number" 
                                value={minSamplesLeaf} 
                                onChange={(e) => setMinSamplesLeaf(Number(e.target.value))} 
                            />
                        </div>
                    </div>

                    {target && features.length > 0 && (
                        <RFOverview 
                            target={target}
                            features={features}
                            dataLength={data.length}
                            nEstimators={nEstimators}
                            maxDepth={maxDepth}
                            minSamplesSplit={minSamplesSplit}
                            minSamplesLeaf={minSamplesLeaf}
                        />
                    )}
                </CardContent>

                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !target || features.length === 0} size="lg">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Training Forest...
                            </>
                        ) : (
                            <>
                                <Sigma className="mr-2 h-4 w-4" />
                                Train Random Forest
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
                        <Card>
                            <CardContent className="p-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-muted-foreground">Overall Accuracy</p>
                                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <p className="text-2xl font-semibold">{(results.accuracy * 100).toFixed(1)}%</p>
                                    <p className="text-xs text-muted-foreground">Correct predictions</p>
                                </div>
                            </CardContent>
                        </Card>

                        {results.roc_auc_data && (
                            <Card>
                                <CardContent className="p-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-muted-foreground">ROC AUC Score</p>
                                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <p className="text-2xl font-semibold">{results.roc_auc_data.auc.toFixed(3)}</p>
                                        <p className="text-xs text-muted-foreground">Area under curve</p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardContent className="p-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-muted-foreground">Avg Precision</p>
                                        <Target className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <p className="text-2xl font-semibold">
                                        {(Object.keys(results.classification_report)
                                            .filter(k => k !== 'accuracy' && k !== 'macro avg' && k !== 'weighted avg')
                                            .reduce((sum, k) => sum + results.classification_report[k].precision, 0) / 
                                            Object.keys(results.classification_report).filter(k => k !== 'accuracy' && k !== 'macro avg' && k !== 'weighted avg').length * 100).toFixed(1)}%
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
                                        <BarChart className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <p className="text-2xl font-semibold">
                                        {(Object.keys(results.classification_report)
                                            .filter(k => k !== 'accuracy' && k !== 'macro avg' && k !== 'weighted avg')
                                            .reduce((sum, k) => sum + results.classification_report[k].recall, 0) / 
                                            Object.keys(results.classification_report).filter(k => k !== 'accuracy' && k !== 'macro avg' && k !== 'weighted avg').length * 100).toFixed(1)}%
                                    </p>
                                    <p className="text-xs text-muted-foreground">True positive rate</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed Analysis Section */}
                    {interpretationSections.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Detailed Analysis</CardTitle>
                                <CardDescription>Comprehensive interpretation of Random Forest results</CardDescription>
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

                    {/* Visualization */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Plots</CardTitle>
                            <CardDescription>Feature importance, ROC curve, and confusion matrix</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image 
                                src={analysisResult.plot.startsWith('data:') ? analysisResult.plot : `data:image/png;base64,${analysisResult.plot}`}
                                alt="Random Forest Analysis Plots" 
                                width={1600} 
                                height={1200} 
                                className="w-full rounded-md border"
                            />
                        </CardContent>
                    </Card>

                    {/* Detailed Results Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Classification Report</CardTitle>
                            <CardDescription>Per-class performance metrics</CardDescription>
                        </CardHeader>
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
                                    {Object.keys(results.classification_report)
                                        .filter(k => k !== 'accuracy' && k !== 'macro avg' && k !== 'weighted avg')
                                        .map(label => (
                                            <TableRow key={label}>
                                                <TableCell className="font-medium">{label}</TableCell>
                                                <TableCell className='text-right font-mono'>
                                                    {results.classification_report[label].precision.toFixed(3)}
                                                </TableCell>
                                                <TableCell className='text-right font-mono'>
                                                    {results.classification_report[label].recall.toFixed(3)}
                                                </TableCell>
                                                <TableCell className='text-right font-mono'>
                                                    {results.classification_report[label]['f1-score'].toFixed(3)}
                                                </TableCell>
                                                <TableCell className='text-right font-mono'>
                                                    {results.classification_report[label].support}
                                                </TableCell>
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