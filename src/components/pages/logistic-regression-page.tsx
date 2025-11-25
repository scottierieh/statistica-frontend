'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Target, CheckCircle, AlertTriangle, HelpCircle, Settings, Binary, TrendingUp, BarChart3, Percent, Layers, BookOpen, FileText, Lightbulb, Info } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Badge } from '../ui/badge';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Switch } from '../ui/switch';

interface LogisticRegressionResults {
    metrics: {
        accuracy: number;
        confusion_matrix: number[][];
        classification_report: {
            [key: string]: {
                precision: number;
                recall: number;
                'f1-score': number;
                support: number;
            };
        };
    };
    coefficients: { [key: string]: number };
    odds_ratios: { [key: string]: number };
    odds_ratios_ci: { [key: string]: { '2.5%': number, '97.5%': number } };
    p_values: { [key: string]: number };
    model_summary: any;
    roc_data: {
        fpr: number[];
        tpr: number[];
        auc: number;
    };
    dependent_classes: string[];
    interpretation: string;
    n_dropped?: number;
    dropped_rows?: number[];
}

interface FullAnalysisResponse {
    results: LogisticRegressionResults;
    plot: string;
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: LogisticRegressionResults }) => {
    const isModelSignificant = results.model_summary.llr_pvalue < 0.05;
    
    const getAUCInterpretation = (auc: number) => {
        if (auc >= 0.9) return 'Excellent';
        if (auc >= 0.8) return 'Good';
        if (auc >= 0.7) return 'Fair';
        if (auc >= 0.6) return 'Poor';
        return 'No discrimination';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Accuracy Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Accuracy
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {(results.metrics.accuracy * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Overall correctness
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* AUC Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                AUC
                            </p>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.roc_data.auc.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getAUCInterpretation(results.roc_data.auc)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Pseudo R² Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Pseudo R²
                            </p>
                            <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.model_summary.prsquared.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Model fit measure
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Model Significance Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                LLR p-value
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${!isModelSignificant ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {results.model_summary.llr_pvalue < 0.001 ? '<0.001' : results.model_summary.llr_pvalue.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {isModelSignificant ? 'Significant' : 'Not Significant'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

// Overview component with clean design matching Robust Regression
const LogisticRegressionOverview = ({ dependentVar, independentVars, dataLength, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Helper function to check if value is missing
        const isMissing = (value: any) => {
            return value == null || value === '' || 
                   (typeof value === 'number' && isNaN(value)) ||
                   (typeof value === 'string' && value.toLowerCase() === 'nan');
        };
        
        // Variable selection status
        if (dependentVar && independentVars.length > 0) {
            overview.push(`Predicting ${dependentVar} using ${independentVars.length} predictor${independentVars.length > 1 ? 's' : ''}`);
        } else if (dependentVar) {
            overview.push(`Predicting ${dependentVar} (no predictors selected)`);
        } else {
            overview.push('Select dependent and independent variables');
        }

        // Dependent variable check
        if (dependentVar && data.length > 0) {
            const depValues = new Set(data.map((row: any) => row[dependentVar]).filter((v: any) => !isMissing(v)));
            if (depValues.size === 2) {
                const classes = Array.from(depValues);
                overview.push(`Binary outcome: ${classes[0]} vs ${classes[1]}`);
            } else if (depValues.size > 0) {
                overview.push(`⚠ Outcome has ${depValues.size} categories (requires exactly 2)`);
            }
        }

        // Sample size with warnings
        if (dataLength < 10) {
            overview.push(`Sample size: ${dataLength} (⚠ Too small - minimum 10 required)`);
        } else if (dataLength < 30) {
            overview.push(`Sample size: ${dataLength} (Small - results may be unstable)`);
        } else if (dataLength < 50) {
            overview.push(`Sample size: ${dataLength} (Moderate)`);
        } else {
            overview.push(`Sample size: ${dataLength} (Good)`);
        }
        
        // Missing value check
        if (data && data.length > 0 && dependentVar && independentVars.length > 0) {
            const allVars = [dependentVar, ...independentVars];
            const missingCount = data.filter((row: any) => 
                allVars.some(varName => isMissing(row[varName]))
            ).length;
            const validCount = dataLength - missingCount;
            
            if (missingCount > 0) {
                overview.push(`⚠ Missing values: ${missingCount} row${missingCount > 1 ? 's' : ''} will be excluded (${validCount} valid)`);
            }
        }
        
        // Predictor count recommendation
        if (independentVars.length > 0 && dataLength > 0) {
            const observationsPerPredictor = Math.floor(dataLength / independentVars.length);
            if (observationsPerPredictor < 10) {
                overview.push(`⚠ Only ${observationsPerPredictor} observations per predictor (recommended: 10+)`);
            }
        }
        
        // Model info
        overview.push('Model type: Binary Logistic Regression');
        overview.push('Estimation method: Maximum Likelihood');
        overview.push('Output: Odds ratios with 95% confidence intervals');

        return overview;
    }, [dependentVar, independentVars, dataLength, data]);

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

// Intro Page matching other analysis pages
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const admissionExample = exampleDatasets.find(d => d.id === 'admission-data');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Binary className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Logistic Regression</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Predict binary outcomes using statistical modeling of probabilities
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Binary Classification</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Models the probability of binary outcomes like yes/no, pass/fail, or true/false
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Percent className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Odds Ratios</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Quantifies how each predictor affects the odds of the outcome occurring
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Model Evaluation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Comprehensive metrics including AUC, accuracy, and significance tests
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            How It Works
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Logistic regression uses the logistic (sigmoid) function to model the probability of a binary outcome. 
                            Unlike linear regression, it ensures predictions are bounded between 0 and 1, making it ideal for classification. 
                            The model estimates coefficients using maximum likelihood estimation, and results are interpreted as odds ratios, 
                            which show how each unit change in a predictor multiplies the odds of the outcome.
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
                                        <span><strong>Dependent variable:</strong> Binary categorical outcome</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Independent variables:</strong> Numeric or categorical predictors</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> 10+ observations per predictor</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Odds ratios:</strong> Effect size of predictors</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>p-values:</strong> Statistical significance</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>AUC:</strong> Model discrimination ability</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>ROC curve:</strong> Visual performance assessment</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {admissionExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(admissionExample)} size="lg">
                                <Binary className="mr-2 h-5 w-5" />
                                Load Sample Admission Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface LogisticRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    allHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function LogisticRegressionPage({ data, numericHeaders, allHeaders, categoricalHeaders, onLoadExample }: LogisticRegressionPageProps) {
    const { toast } = useToast();
    const [showIntro, setShowIntro] = useState(data.length === 0);
    const [dependentVar, setDependentVar] = useState<string | undefined>();
    const [independentVars, setIndependentVars] = useState<string[]>([]);
    const [standardize, setStandardize] = useState(false);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const binaryCategoricalHeaders = useMemo(() => {
        return allHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size === 2);
    }, [data, allHeaders]);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2 && binaryCategoricalHeaders.length >= 1, [data, allHeaders, binaryCategoricalHeaders]);

    useEffect(() => {
        if (data.length === 0) {
            setShowIntro(true);
        } else if (canRun) {
            const defaultDepVar = binaryCategoricalHeaders[0] || allHeaders[0];
            setDependentVar(defaultDepVar);
            const initialIndepVars = allHeaders.filter(h => h !== defaultDepVar);
            setIndependentVars(initialIndepVars);
            setAnalysisResult(null);
            setShowIntro(false);
        }
    }, [data, allHeaders, binaryCategoricalHeaders, canRun]);

    const availableFeatures = useMemo(() => allHeaders.filter(h => h !== dependentVar), [allHeaders, dependentVar]);
    
    const handleIndepVarChange = (header: string, checked: boolean) => {
        setIndependentVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a binary dependent variable.' });
            return;
        }
        if (independentVars.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least one independent variable.' });
            return;
        }
        
        const dependentVarValues = new Set(data.map(row => row[dependentVar]).filter(v => v != null && v !== ''));
        if (dependentVarValues.size !== 2) {
            toast({ variant: 'destructive', title: 'Invalid Dependent Variable', description: `The selected dependent variable '${dependentVar}' must have exactly two unique categories. Found ${dependentVarValues.size}.`});
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/logistic-regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVar, independentVars, standardize })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Logistic Regression error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, independentVars, standardize, toast]);

    if (showIntro || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;
    const isModelSignificant = results?.model_summary.llr_pvalue < 0.05;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="font-headline">Model Configuration</CardTitle>
                            <CardDescription>
                                Select a binary dependent variable and predictor variables to build your classification model
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
                            <Label>Dependent Variable (Binary Outcome)</Label>
                            <Select value={dependentVar} onValueChange={setDependentVar}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an outcome variable" />
                                </SelectTrigger>
                                <SelectContent>
                                    {binaryCategoricalHeaders.map(h => (
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Independent Variables (Predictors)</Label>
                            <ScrollArea className="h-24 border rounded-md p-2">
                                {availableFeatures.map(h => (
                                    <div key={h} className="flex items-center space-x-2 mb-1">
                                        <Checkbox 
                                            id={`iv-${h}`} 
                                            checked={independentVars.includes(h)} 
                                            onCheckedChange={(c) => handleIndepVarChange(h, c as boolean)} 
                                        />
                                        <Label htmlFor={`iv-${h}`} className="text-sm font-normal cursor-pointer">{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                    
                                     
                    {/* Overview component */}
                    <LogisticRegressionOverview 
                        dependentVar={dependentVar}
                        independentVars={independentVars}
                        dataLength={data.length}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={!dependentVar || independentVars.length === 0 || isLoading} size="lg">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Running Analysis...
                            </>
                        ) : (
                            <>
                                <Sigma className="mr-2 h-4 w-4" />
                                Run Logistic Regression
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

            {results && analysisResult?.plot && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />
                    
                    {/* Data Quality Information */}
                    {results.n_dropped !== undefined && results.n_dropped > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Data Quality</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Missing Values Detected</AlertTitle>
                                    <AlertDescription>
                                        <p className="mb-2">
                                            {results.n_dropped} row{results.n_dropped > 1 ? 's were' : ' was'} excluded from the analysis due to missing values.
                                        </p>
                                        {results.dropped_rows && results.dropped_rows.length > 0 && (
                                            <details className="mt-2">
                                                <summary className="cursor-pointer font-medium text-sm hover:underline">
                                                    View excluded row indices (0-based)
                                                </summary>
                                                <div className="mt-2 p-2 bg-destructive/10 rounded text-xs font-mono">
                                                    {results.dropped_rows.length <= 20 
                                                        ? results.dropped_rows.join(', ')
                                                        : `${results.dropped_rows.slice(0, 20).join(', ')} ... and ${results.dropped_rows.length - 20} more`
                                                    }
                                                </div>
                                            </details>
                                        )}
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    )}
                    
                    {/* Detailed Analysis - Crosstab 스타일 적용 */}
                    {results.interpretation && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2">
                                    <Target className="h-5 w-5 text-primary" />
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
                                            
                                            let icon = Target;
                                            if (title.includes('Overall')) icon = Target;
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
                                        if (Icon === Target) {
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

                    {/* Visualization */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Model Visualization</CardTitle>
                            <CardDescription>ROC curve and confusion matrix</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div>
                                <Image 
                                    src={analysisResult.plot} 
                                    alt="Logistic Regression Plots" 
                                    width={1400} 
                                    height={600} 
                                    className="1/2 w-full rounded-md border" 
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Model Performance Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Model Performance Summary</CardTitle>
                            <CardDescription>Key statistical metrics</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">Accuracy</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {(results.metrics.accuracy * 100).toFixed(1)}%
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">AUC-ROC</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {results.roc_data.auc.toFixed(3)}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Pseudo R²</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {results.model_summary.prsquared.toFixed(3)}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Log-Likelihood</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {results.model_summary.llf.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">LLR p-value</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {results.model_summary.llr_pvalue < 0.001 ? '<0.001' : results.model_summary.llr_pvalue.toFixed(4)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter>
                            <p className="text-sm text-muted-foreground">
                                AUC: 0.9+ Excellent | 0.8-0.9 Good | 0.7-0.8 Fair | 0.6-0.7 Poor | Pseudo R²: Similar to R² but for logistic models
                            </p>
                        </CardFooter>
                    </Card>

                    {/* Coefficients & Odds Ratios */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Coefficients & Odds Ratios</CardTitle>
                            <CardDescription>
                                Effect of each predictor on the outcome probability
                                {standardize && " (standardized coefficients)"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Variable</TableHead>
                                        <TableHead className="text-right">Coefficient</TableHead>
                                        <TableHead className="text-right">Odds Ratio</TableHead>
                                        <TableHead className="text-right">95% CI</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(results.coefficients).map(([variable, coeff]) => (
                                        <TableRow key={variable}>
                                            <TableCell className="font-medium">{variable}</TableCell>
                                            <TableCell className="text-right font-mono">{coeff.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{results.odds_ratios[variable].toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                                [{results.odds_ratios_ci[variable]['2.5%'].toFixed(3)}, {results.odds_ratios_ci[variable]['97.5%'].toFixed(3)}]
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {results.p_values[variable] < 0.001 ? '<.001' : results.p_values[variable].toFixed(4)}
                                                {getSignificanceStars(results.p_values[variable])}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter>
                            <p className="text-sm text-muted-foreground">
                                Odds ratio &gt; 1 indicates increased odds of the outcome | Odds ratio &lt; 1 indicates decreased odds | Significance: *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05
                                {standardize && " | Coefficients are standardized for direct comparison"}
                            </p>
                        </CardFooter>
                    </Card>

                    {/* Classification Report */}
                    <Card>
                         <CardHeader>
                            <CardTitle>Classification Report</CardTitle>
                            <CardDescription>
                                Per-class performance metrics
                            </CardDescription>
                         </CardHeader>
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
                                    {results.dependent_classes.map(cls => {
                                        const report = results.metrics.classification_report[cls];
                                        return (
                                            <TableRow key={cls}>
                                                <TableCell className="font-medium">{cls}</TableCell>
                                                <TableCell className="text-right font-mono">{report.precision.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{report.recall.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{report['f1-score'].toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">{report.support}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                         </CardContent>
                         <CardFooter>
                            <p className="text-sm text-muted-foreground">
                                Precision: Accuracy of positive predictions | Recall: Coverage of actual positives | F1-Score: Harmonic mean of precision and recall
                            </p>
                         </CardFooter>
                    </Card>
                </div>
            )}

            {!isLoading && !analysisResult && (
                <div className="text-center text-muted-foreground py-10">
                    <Layers className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Configure your model and click 'Run Logistic Regression' to see results.</p>
                </div>
            )}
        </div>
    );
}


