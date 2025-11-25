'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Container, AlertTriangle, CheckCircle, TrendingUp, HelpCircle, Settings, BarChart, Target, Percent, Layers, BookOpen, Shield, Minimize2, LineChart, FileSearch, Lightbulb, Info } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Slider } from '../ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';

interface RegressionMetrics {
    r2_score: number;
    rmse: number;
    mae: number;
}

interface RidgeRegressionResults {
    metrics: {
        test: RegressionMetrics;
        train: RegressionMetrics;
    };
    coefficients: { [key: string]: number };
    intercept: number;
    alpha: number;
    interpretation: string;
}

interface FullAnalysisResponse {
    results: RidgeRegressionResults;
    plot: string | null;
    path_plot: string | null;
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: RidgeRegressionResults }) => {
    const trainTestGap = Math.abs(results.metrics.train.r2_score - results.metrics.test.r2_score);
    const isOverfitting = trainTestGap > 0.1;
    
    const getR2Interpretation = (r2: number) => {
        if (r2 >= 0.75) return 'Excellent fit';
        if (r2 >= 0.50) return 'Good fit';
        if (r2 >= 0.25) return 'Moderate fit';
        return 'Weak fit';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Test R² Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Test R²
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.metrics.test.r2_score.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getR2Interpretation(results.metrics.test.r2_score)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* RMSE Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Test RMSE
                            </p>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.metrics.test.rmse.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Prediction error
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Alpha Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Alpha (α)
                            </p>
                            <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.alpha.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Regularization strength
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Train-Test Gap Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                R² Gap
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${isOverfitting ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {trainTestGap.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {isOverfitting ? 'Potential overfitting' : 'Good generalization'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component
const RidgeRegressionOverview = ({ target, features, alpha, testSize, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        if (target && features.length > 0) {
            overview.push(`Predicting ${target} using ${features.length} feature${features.length > 1 ? 's' : ''}`);
            overview.push(`Regularization strength (α): ${alpha.toFixed(3)}`);
        } else {
            overview.push('Select target variable and features');
        }

        const trainSize = Math.round((1 - testSize) * data.length);
        const testSizeNum = data.length - trainSize;
        overview.push(`Train/Test split: ${trainSize}/${testSizeNum} observations (${Math.round((1-testSize)*100)}%/${Math.round(testSize*100)}%)`);

        if (features.length > 0) {
            const ratio = Math.floor(trainSize / features.length);
            if (ratio < 10) {
                overview.push(`⚠ Only ${ratio} training observations per feature (aim for 10+)`);
            } else if (ratio < 20) {
                overview.push(`${ratio} training observations per feature (adequate)`);
            } else {
                overview.push(`${ratio} training observations per feature (good)`);
            }
        }
        
        overview.push('Model type: Ridge (L2 regularization)');
        overview.push('Shrinks coefficients toward zero (but not to zero)');
        overview.push('Particularly effective for multicollinearity');

        return overview;
    }, [target, features, alpha, testSize, data]);

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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const regressionExample = exampleDatasets.find(ex => ex.id === 'regression-suite');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Container className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Ridge Regression</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Regularized regression to prevent overfitting and handle multicollinearity
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Shield className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Overfitting Protection</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    L2 penalty prevents model from fitting noise in data
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Minimize2 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Coefficient Shrinkage</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Reduces coefficient magnitudes for stability
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <LineChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Multicollinearity Fix</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Handles correlated predictors effectively
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
                            Use Ridge regression when you have many predictors, multicollinearity issues, or when 
                            ordinary least squares overfits. It&apos;s ideal for prediction tasks where you want to 
                            retain all features but reduce their impact, especially with correlated predictors or 
                            when the number of features approaches the number of observations.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Target:</strong> Continuous numeric variable</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Features:</strong> Numeric predictors</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Alpha:</strong> Tune via cross-validation</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> 10+ observations per feature</span>
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
                                        <span><strong>R² comparison:</strong> Train vs Test gap indicates fit</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Coefficients:</strong> Shrunk toward zero, not eliminated</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Alpha effect:</strong> Higher α = more shrinkage</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Path plot:</strong> Shows coefficient trajectories</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {regressionExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(regressionExample)} size="lg">
                                <Container className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface RidgeRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function RidgeRegressionPage({ data, numericHeaders, onLoadExample }: RidgeRegressionPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [target, setTarget] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    const [alpha, setAlpha] = useState(1.0);
    const [testSize, setTestSize] = useState(0.2);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== target), [numericHeaders, target]);
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    useEffect(() => {
        const defaultTarget = numericHeaders.length > 1 ? numericHeaders[numericHeaders.length - 1] : numericHeaders[0];
        setTarget(defaultTarget);
        setFeatures(numericHeaders.filter(h => h !== defaultTarget));
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

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
            const response = await fetch('/api/analysis/ridge-regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, target, features, alpha, test_size: testSize })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Ridge Regression error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, target, features, alpha, testSize, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;
    const trainTestGap = results ? Math.abs(results.metrics.train.r2_score - results.metrics.test.r2_score) : 0;
    const isOverfitting = trainTestGap > 0.1;

    return (
        <div className="space-y-4">
            {/* Setup Card */}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Ridge Regression Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>
                        Configure your Ridge regression model with regularization parameter and train/test split
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Target Variable (Y)</Label>
                            <Select value={target} onValueChange={setTarget}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Feature Variables (X)</Label>
                            <ScrollArea className="h-32 border rounded-md p-4">
                                <div className="grid grid-cols-2 gap-2">
                                    {availableFeatures.map(h => (
                                        <div key={h} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`feat-${h}`} 
                                                checked={features.includes(h)} 
                                                onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} 
                                            />
                                            <Label htmlFor={`feat-${h}`} className="text-sm">{h}</Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Alpha (Regularization Strength): {alpha.toFixed(3)}</Label>
                            <Slider 
                                value={[alpha]} 
                                onValueChange={v => setAlpha(v[0])} 
                                min={0.01} 
                                max={10.0} 
                                step={0.01} 
                                className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Higher values increase coefficient shrinkage
                            </p>
                        </div>
                        <div>
                            <Label>Test Set Size: {Math.round(testSize*100)}%</Label>
                            <Slider 
                                value={[testSize]} 
                                onValueChange={v => setTestSize(v[0])} 
                                min={0.1} 
                                max={0.5} 
                                step={0.05} 
                                className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Proportion of data reserved for model evaluation
                            </p>
                        </div>
                    </div>
                    
                    <RidgeRegressionOverview 
                        target={target}
                        features={features}
                        alpha={alpha}
                        testSize={testSize}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !target || features.length === 0}>
                        {isLoading ? 
                            <><Loader2 className="mr-2 animate-spin"/> Running...</> : 
                            <><Sigma className="mr-2"/>Run Analysis</>
                        }
                    </Button>
                </CardFooter>
            </Card>

            {/* Loading State */}
            {isLoading && (
                <Card>
                    <CardContent className="p-6">
                        <Skeleton className="h-96 w-full"/>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {analysisResult && results && (
                <div className="space-y-4">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />
                    
                    {/* Detailed Analysis - Crosstab 스타일 적용 */}
                    {results.interpretation && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2">
                                    <Shield className="h-5 w-5 text-primary" />
                                    Detailed Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {(() => {
                                    const interpretation = results.interpretation;
                                    const sections: { title: string; content: string[]; icon: any }[] = [];
                                    
                                    const lines = interpretation.split('\n').filter(l => l.trim());
                                    let currentSection: typeof sections[0] | null = null;
                                    
                                    lines.forEach((line) => {
                                        const trimmed = line.trim();
                                        if (!trimmed) return;
                                        
                                        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                                            const title = trimmed.replace(/\*\*/g, '').trim();
                                            
                                            let icon = Shield;
                                            if (title.includes('Overall')) icon = Shield;
                                            else if (title.includes('Statistical') || title.includes('Insights')) icon = Lightbulb;
                                            else if (title.includes('Recommendations')) icon = BookOpen;
                                            
                                            currentSection = { title, content: [], icon };
                                            sections.push(currentSection);
                                        } else if (currentSection) {
                                            currentSection.content.push(trimmed);
                                        }
                                    });
                                    
                                    return sections.map((section, idx) => {
                                        const Icon = section.icon;
                                        
                                        let gradientClass = '';
                                        let borderClass = '';
                                        let iconBgClass = '';
                                        let iconColorClass = '';
                                        let bulletColorClass = '';
                                        
                                        // Color based on icon type, not index or title
                                        if (Icon === Shield) {
                                            // First section - Primary color
                                            gradientClass = 'bg-gradient-to-br from-primary/5 to-primary/10';
                                            borderClass = 'border-primary/40';
                                            iconBgClass = 'bg-primary/10';
                                            iconColorClass = 'text-primary';
                                            bulletColorClass = 'text-primary';
                                        } else if (Icon === Lightbulb) {
                                            // Second section - Blue color
                                            gradientClass = 'bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10';
                                            borderClass = 'border-blue-300 dark:border-blue-700';
                                            iconBgClass = 'bg-blue-500/10';
                                            iconColorClass = 'text-blue-600 dark:text-blue-400';
                                            bulletColorClass = 'text-blue-600 dark:text-blue-400';
                                        } else {
                                            // Third section - Amber/Orange color
                                            gradientClass = 'bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10';
                                            borderClass = 'border-amber-300 dark:border-amber-700';
                                            iconBgClass = 'bg-amber-500/10';
                                            iconColorClass = 'text-amber-600 dark:text-amber-400';
                                            bulletColorClass = 'text-amber-600 dark:text-amber-400';
                                        }
                                        
                                        return (
                                            <div key={idx} className={`${gradientClass} rounded-lg p-6 border ${borderClass}`}>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className={`p-2 ${iconBgClass} rounded-md`}>
                                                        <Icon className={`h-4 w-4 ${iconColorClass}`} />
                                                    </div>
                                                    <h3 className="font-semibold text-base">{section.title}</h3>
                                                </div>
                                                <div className="space-y-3">
                                                    {section.content.map((text, textIdx) => {
                                                        if (text.startsWith('→')) {
                                                            return (
                                                                <div key={textIdx} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                                    <span className={`${bulletColorClass} font-bold mt-0.5`}>→</span>
                                                                    <div dangerouslySetInnerHTML={{ __html: text.substring(1).trim().replace(/\*\*/g, '') }} />
                                                                </div>
                                                            );
                                                        } else if (text.startsWith('•') || text.startsWith('-')) {
                                                            return (
                                                                <div key={textIdx} className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed">
                                                                    <span className={`${bulletColorClass} font-bold mt-0.5`}>•</span>
                                                                    <div dangerouslySetInnerHTML={{ __html: text.substring(1).trim().replace(/\*\*/g, '') }} />
                                                                </div>
                                                            );
                                                        }
                                                        
                                                        return (
                                                            <p key={textIdx} className="text-sm text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: text.replace(/\*\*/g, '') }} />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </CardContent>
                        </Card>
                    )}

                    {/* Diagnostic Plots */}
                    {analysisResult.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Diagnostic Plots</CardTitle>
                                <CardDescription>
                                    Visual assessment of model fit and residual patterns
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image 
                                    src={analysisResult.plot} 
                                    alt="Ridge Regression Diagnostic Plots" 
                                    width={1000}
                                    height={833} 
                                    className="max-w-5xl mx-auto" 
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Train vs Test Performance */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Train vs. Test Performance</CardTitle>
                            <CardDescription>
                                Comparison of model metrics on training and test sets
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metric</TableHead>
                                        <TableHead className="text-right">Train</TableHead>
                                        <TableHead className="text-right">Test</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">R²</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {results.metrics.train.r2_score.toFixed(4)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {results.metrics.test.r2_score.toFixed(4)}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">RMSE</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {results.metrics.train.rmse.toFixed(3)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {results.metrics.test.rmse.toFixed(3)}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">MAE</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {results.metrics.train.mae.toFixed(3)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {results.metrics.test.mae.toFixed(3)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter>
                            <p className="text-sm text-muted-foreground">
                                Large gaps between train and test metrics indicate overfitting. Ridge regularization helps reduce this gap.
                            </p>
                        </CardFooter>
                    </Card>

                    {/* Regularization Path */}
                    {analysisResult.path_plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Regularization Path</CardTitle>
                                <CardDescription>
                                    Shows how coefficients shrink toward zero as alpha increases
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image 
                                    src={analysisResult.path_plot} 
                                    alt="Ridge Coefficient Path" 
                                    width={1200} 
                                    height={600} 
                                    className="w-full rounded-md border"
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Coefficients Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Model Coefficients</CardTitle>
                            <CardDescription>
                                Ridge shrinks all coefficients toward zero (but not to exactly zero)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Feature</TableHead>
                                            <TableHead className="text-right">Coefficient</TableHead>
                                            <TableHead className="text-right">Magnitude</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-semibold">(Intercept)</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {results.intercept.toFixed(4)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline">Intercept</Badge>
                                            </TableCell>
                                        </TableRow>
                                        {Object.entries(results.coefficients)
                                            .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                                            .map(([feature, coeff]) => {
                                                const absCoeff = Math.abs(coeff);
                                                const isSmall = absCoeff < 0.01;
                                                return (
                                                    <TableRow key={feature}>
                                                        <TableCell className={isSmall ? 'text-muted-foreground' : ''}>
                                                            {feature}
                                                        </TableCell>
                                                        <TableCell className={`text-right font-mono ${isSmall ? 'text-muted-foreground' : ''}`}>
                                                            {coeff.toFixed(4)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Badge variant={absCoeff >= 1 ? 'default' : absCoeff >= 0.1 ? 'secondary' : 'outline'}>
                                                                {absCoeff.toFixed(3)}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        }
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                        <CardFooter>
                            <p className="text-sm text-muted-foreground">
                                Ridge regression shrinks coefficients toward zero to reduce model complexity and combat multicollinearity. 
                                Unlike Lasso, it does not eliminate features entirely.
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && !analysisResult && (
                <div className="text-center text-muted-foreground py-10">
                    <Container className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Configure your model and click &apos;Run Analysis&apos; to see results.</p>
                </div>
            )}
        </div>
    );
}

