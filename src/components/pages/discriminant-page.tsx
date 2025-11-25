'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Users, CheckCircle, BarChart as BarChartIcon, AlertTriangle, HelpCircle, Settings, FileSearch, Target, TrendingUp, Layers, BookOpen, FileText, XCircle, Lightbulb } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';

interface DiscriminantAnalysisResults {
    meta: {
        groups: string[];
        n_components: number;
        predictor_vars: string[];
    };
    classification_metrics: {
        accuracy: number;
        precision: number;
        recall: number;
        f1_score: number;
        confusion_matrix: number[][];
        class_report: any;
        true_labels: number[];
        predicted_labels: number[];
    };
    eigenvalues: number[];
    canonical_correlations: number[];
    wilks_lambda: {
        lambda: number;
        F: number;
        df1: number;
        df2: number;
        p_value: number;
    };
    standardized_coeffs: number[][];
    structure_matrix: number[][];
    group_centroids: number[][];
    lda_transformed_data: number[][];
    true_labels_full: number[];
    interpretation?: string;
}

interface FullAnalysisResponse {
    results: DiscriminantAnalysisResults;
    plots: {
        lda_analysis: string;
        [key: string]: string | null | undefined;
    }
}

const getAccuracyInterpretation = (acc: number) => {
    if (acc >= 0.90) return 'Excellent';
    if (acc >= 0.75) return 'Good';
    if (acc >= 0.60) return 'Fair';
    return 'Poor';
};

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: any }) => {
    const isSignificant = results.wilks_lambda.p_value <= 0.05;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Accuracy Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Classification Accuracy
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {(results.classification_metrics.accuracy * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getAccuracyInterpretation(results.classification_metrics.accuracy)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Wilks' Lambda Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Wilks' Lambda
                            </p>
                            <BarChartIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${!isSignificant ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {results.wilks_lambda.lambda.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {isSignificant ? 'Significant' : 'Not Significant'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Canonical Correlation Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Canonical Correlation
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.canonical_correlations[0].toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            First function
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Groups Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Groups
                            </p>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.meta.groups.length}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.meta.n_components} function{results.meta.n_components > 1 ? 's' : ''}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const discriminantExample = exampleDatasets.find(d => d.id === 'survival-churn');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Users className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Discriminant Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Classification method that finds linear combinations to separate groups
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Users className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Group Classification</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Predict group membership from continuous independent variables
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Variable Importance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identify which predictors best distinguish between groups
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Layers className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Linear Functions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Creates discriminant functions to maximize group separation
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
                            Discriminant Analysis predicts group membership from continuous variables by finding linear 
                            combinations that maximize separation between groups. It's useful for understanding which 
                            variables distinguish groups and for building predictive classification models.
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
                                        <span><strong>Group variable:</strong> Categorical with 2+ groups</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Predictors:</strong> Continuous numeric variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> At least 20 per group recommended</span>
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
                                        <span><strong>Wilks' Lambda:</strong> Test of function significance</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Coefficients:</strong> Predictor importance weights</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Scatterplot:</strong> Visual group separation</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {discriminantExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(discriminantExample)} size="lg">
                                <Users className="mr-2 h-5 w-5" />
                                Load Loan Approval Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component
const DiscriminantOverview = ({ groupVar, predictorVars, numGroups, dataLength, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        if (groupVar && predictorVars.length > 0) {
            overview.push(`Classifying ${groupVar} using ${predictorVars.length} predictor${predictorVars.length > 1 ? 's' : ''}`);
        } else {
            overview.push('Select group variable and predictor variables');
        }

        if (numGroups >= 2) {
            overview.push(`Groups detected: ${numGroups}`);
        } else if (numGroups > 0) {
            overview.push(`⚠ Only ${numGroups} group (minimum 2 required)`);
        }

        if (dataLength < 20) {
            overview.push(`Sample size: ${dataLength} observations (⚠ Very small - results unreliable)`);
        } else if (dataLength < 50) {
            overview.push(`Sample size: ${dataLength} observations (Small - check assumptions)`);
        } else {
            overview.push(`Sample size: ${dataLength} observations (Good)`);
        }
        
        const isMissing = (value: any) => {
            return value == null || value === '' || 
                   (typeof value === 'number' && isNaN(value)) ||
                   (typeof value === 'string' && value.toLowerCase() === 'nan');
        };
        
        if (data && data.length > 0 && groupVar && predictorVars.length > 0) {
            const allVars = [groupVar, ...predictorVars];
            const missingCount = data.filter((row: any) => 
                allVars.some(v => isMissing(row[v]))
            ).length;
            const validCount = dataLength - missingCount;
            
            if (missingCount > 0) {
                overview.push(`⚠ Missing values: ${missingCount} rows will be excluded (${validCount} valid observations)`);
            } else {
                overview.push(`✓ No missing values detected`);
            }
        }
        
        if (numGroups > 0 && dataLength > 0) {
            const avgPerGroup = Math.floor(dataLength / numGroups);
            if (avgPerGroup < 10) {
                overview.push(`⚠ Average ${avgPerGroup} observations per group (low)`);
            }
        }
        
        overview.push('Method: Linear Discriminant Analysis (LDA)');

        return overview;
    }, [groupVar, predictorVars, numGroups, dataLength, data]);

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

interface DiscriminantPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function DiscriminantPage({ data, numericHeaders, categoricalHeaders, onLoadExample }: DiscriminantPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [groupVar, setGroupVar] = useState<string | undefined>(categoricalHeaders[0]);
    const [predictorVars, setPredictorVars] = useState<string[]>(numericHeaders);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1 && categoricalHeaders.length >= 1, [data, numericHeaders, categoricalHeaders]);

    const numGroups = useMemo(() => {
        if (!groupVar || data.length === 0) return 0;
        return new Set(data.map(row => row[groupVar]).filter(v => v != null && v !== '')).size;
    }, [data, groupVar]);

    useEffect(() => {
        setGroupVar(categoricalHeaders[0] || '');
        setPredictorVars(numericHeaders);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [categoricalHeaders, numericHeaders, data, canRun]);
    
    const handlePredictorSelectionChange = (header: string, checked: boolean) => {
        setPredictorVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!groupVar || predictorVars.length < 1) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a group variable and at least one predictor variable.'});
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch('/api/analysis/discriminant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, groupVar, predictorVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            toast({ title: 'Discriminant Analysis Complete', description: 'Results are ready.' });

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'Analysis Error', description: e.message || 'An unexpected error occurred.'})
            setAnalysisResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, groupVar, predictorVars, toast]);

    const availableFeatures = useMemo(() => {
        return numericHeaders.filter(h => h !== groupVar);
    }, [numericHeaders, groupVar]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const { results, plots } = analysisResult || {};
    const isSignificant = results ? results.wilks_lambda.p_value < 0.05 : false;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="font-headline">Discriminant Analysis Setup</CardTitle>
                            <CardDescription>Select a group variable (categorical) and numeric predictors.</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 w-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="groupVar">Group Variable (Categorical)</Label>
                            <Select value={groupVar} onValueChange={setGroupVar}>
                                <SelectTrigger id="groupVar"><SelectValue placeholder="Select grouping variable..." /></SelectTrigger>
                                <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                            {numGroups > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    <Badge variant="outline">{numGroups} groups</Badge>
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label>Predictor Variables (Numeric)</Label>
                            <ScrollArea className="h-32 border rounded-md p-4">
                                <div className="grid grid-cols-2 gap-2">
                                    {availableFeatures.map(header => (
                                        <div key={header} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`pred-${header}`} 
                                                checked={predictorVars.includes(header)} 
                                                onCheckedChange={(checked) => handlePredictorSelectionChange(header, checked as boolean)} 
                                            />
                                            <Label htmlFor={`pred-${header}`} className="text-sm">{header}</Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                    
                    {/* Overview component */}
                    <DiscriminantOverview 
                        groupVar={groupVar}
                        predictorVars={predictorVars}
                        numGroups={numGroups}
                        dataLength={data.length}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2 h-4 w-4"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && plots?.lda_analysis && (
                <div className="space-y-4">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Detailed Analysis - Matching other pages style */}
                    {results.interpretation && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2">
                                    <Users className="h-5 w-5 text-primary" />
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
                                            
                                            let icon = Users;
                                            if (title.includes('Overall')) icon = Users;
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
                                        
                                        // Color based on icon type
                                        if (Icon === Users) {
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

                    {/* Model Statistics Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Model Statistics</CardTitle>
                            <CardDescription>Overall discriminant function significance tests</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Statistic</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                        <TableHead className="text-right">df1</TableHead>
                                        <TableHead className="text-right">df2</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">Wilks' Lambda</TableCell>
                                        <TableCell className="text-right font-mono">{results.wilks_lambda.lambda.toFixed(4)}</TableCell>
                                        <TableCell className="text-right font-mono">—</TableCell>
                                        <TableCell className="text-right font-mono">—</TableCell>
                                        <TableCell className="text-right font-mono">—</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">F-statistic</TableCell>
                                        <TableCell className="text-right font-mono">{results.wilks_lambda.F.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono">{results.wilks_lambda.df1.toFixed(0)}</TableCell>
                                        <TableCell className="text-right font-mono">{results.wilks_lambda.df2.toFixed(0)}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {results.wilks_lambda.p_value < 0.001 ? '<.001' : results.wilks_lambda.p_value.toFixed(4)}
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">Canonical Correlation</TableCell>
                                        <TableCell className="text-right font-mono">{results.canonical_correlations[0].toFixed(4)}</TableCell>
                                        <TableCell className="text-right font-mono">—</TableCell>
                                        <TableCell className="text-right font-mono">—</TableCell>
                                        <TableCell className="text-right font-mono">—</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Eigenvalues Table */}
                    {results.eigenvalue_details && results.eigenvalue_details.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Eigenvalues & Variance Explained</CardTitle>
                                <CardDescription>Contribution of each discriminant function</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Function</TableHead>
                                            <TableHead className="text-right">Eigenvalue</TableHead>
                                            <TableHead className="text-right">% of Variance</TableHead>
                                            <TableHead className="text-right">Cumulative %</TableHead>
                                            <TableHead className="text-right">Canonical Correlation</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.eigenvalue_details.map((detail: any, idx: number) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">{detail.function}</TableCell>
                                                <TableCell className="text-right font-mono">{detail.eigenvalue.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{(detail.variance_explained * 100).toFixed(1)}%</TableCell>
                                                <TableCell className="text-right font-mono">{(detail.cumulative_variance * 100).toFixed(1)}%</TableCell>
                                                <TableCell className="text-right font-mono">{detail.canonical_correlation.toFixed(4)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Group Descriptive Statistics */}
                    {results.group_stats && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Group Descriptive Statistics</CardTitle>
                                <CardDescription>Mean and standard deviation of predictors by group</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {Object.entries(results.group_stats).map(([group, stats]: [string, any]) => (
                                        <div key={group}>
                                            <h4 className="text-sm font-semibold mb-2">{group} (N = {stats.n})</h4>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Variable</TableHead>
                                                        <TableHead className="text-right">Mean</TableHead>
                                                        <TableHead className="text-right">Std. Dev</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {stats.predictor_names.map((name: string, idx: number) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="font-medium">{name}</TableCell>
                                                            <TableCell className="text-right font-mono">{stats.means[idx].toFixed(3)}</TableCell>
                                                            <TableCell className="text-right font-mono">{stats.stds[idx].toFixed(3)}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Prior Probabilities */}
                    {results.priors && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Prior Probabilities</CardTitle>
                                <CardDescription>A priori classification probabilities for each group</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Group</TableHead>
                                            <TableHead className="text-right">Prior Probability</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.meta.groups.map((group: string, idx: number) => (
                                            <TableRow key={idx}>
                                                <TableCell className="font-medium">{group}</TableCell>
                                                <TableCell className="text-right font-mono">{results.priors[idx].toFixed(4)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Box's M Test */}
                    {results.box_m_test && results.box_m_test.statistic !== null && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Box's M Test</CardTitle>
                                <CardDescription>Test for homogeneity of covariance matrices</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Statistic</TableHead>
                                            <TableHead className="text-right">df</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                            <TableHead className="text-right">Assumption</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-mono">{results.box_m_test.statistic.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{results.box_m_test.df.toFixed(0)}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {results.box_m_test.p_value < 0.001 ? '<.001' : results.box_m_test.p_value.toFixed(4)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {results.box_m_test.homogeneous ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                        <CheckCircle className="h-3 w-3 mr-1" />
                                                        Met
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                                        <XCircle className="h-3 w-3 mr-1" />
                                                        Not Met
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                                <p className="text-xs text-muted-foreground mt-2">
                                    * p &gt; 0.05 suggests homogeneous covariance matrices across groups (assumption met)
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Classification Function Coefficients */}
                    {results.classification_function_coeffs && results.classification_function_intercepts && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Classification Function Coefficients</CardTitle>
                                <CardDescription>
                                    Fisher's linear discriminant functions for classification
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Variable</TableHead>
                                            {results.meta.groups.map((g: string) => 
                                                <TableHead key={g} className="text-right">{g}</TableHead>
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.meta.predictor_vars.map((v: string, i: number) => (
                                            <TableRow key={v}>
                                                <TableCell className="font-medium">{v}</TableCell>
                                                {results.meta.groups.map((g: string) => 
                                                    <TableCell key={g} className="font-mono text-right">
                                                        {results.classification_function_coeffs[g][i]?.toFixed(4) || 'N/A'}
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                        <TableRow className="border-t-2">
                                            <TableCell className="font-semibold">(Constant)</TableCell>
                                            {results.meta.groups.map((g: string) => 
                                                <TableCell key={g} className="font-mono text-right font-semibold">
                                                    {results.classification_function_intercepts[g]?.toFixed(4) || 'N/A'}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    </TableBody>
                                </Table>
                                <p className="text-xs text-muted-foreground mt-2">
                                    * For each observation, calculate scores for all groups and classify to the group with highest score
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Visualization */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Visualization</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Image 
                                src={`data:image/png;base64,${plots.lda_analysis}`} 
                                alt="Discriminant Analysis Visualization" 
                                width={1400} 
                                height={1000} 
                                className="w-3/4 mx-auto rounded-sm border" 
                            />
                        </CardContent>
                    </Card>

                    {/* Classification Metrics */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Classification Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Accuracy</span>
                                        <Badge variant="default">{(results.classification_metrics.accuracy * 100).toFixed(1)}%</Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Precision</span>
                                        <Badge variant="outline">{(results.classification_metrics.precision * 100).toFixed(1)}%</Badge>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Recall</span>
                                        <Badge variant="outline">{(results.classification_metrics.recall * 100).toFixed(1)}%</Badge>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">F1-Score</span>
                                        <Badge variant="outline">{(results.classification_metrics.f1_score * 100).toFixed(1)}%</Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Coefficients */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Standardized Canonical Coefficients</CardTitle>
                            <CardDescription>Relative importance of each predictor in discriminant functions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Variable</TableHead>
                                        {Array.from({length: results.meta.n_components}).map((_, i) => 
                                            <TableHead key={i} className="text-right">LD{i+1}</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.meta.predictor_vars.map((v, i) => (
                                        <TableRow key={v}>
                                            <TableCell className="font-medium">{v}</TableCell>
                                            {results.standardized_coeffs[i]?.map((c, j) => 
                                                <TableCell key={j} className="font-mono text-right">{c.toFixed(4)}</TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Structure Matrix */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Structure Matrix (Loadings)</CardTitle>
                            <CardDescription>Correlations between predictors and discriminant functions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Variable</TableHead>
                                        {Array.from({length: results.meta.n_components}).map((_, i) => 
                                            <TableHead key={i} className="text-right">LD{i+1}</TableHead>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.meta.predictor_vars.map((v, i) => (
                                        <TableRow key={v}>
                                            <TableCell className="font-medium">{v}</TableCell>
                                            {results.structure_matrix[i]?.map((c, j) => 
                                                <TableCell key={j} className="font-mono text-right">{c.toFixed(4)}</TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Layers className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select variables and click 'Run Analysis' to perform discriminant analysis.</p>
                </div>
            )}
        </div>
    );
}


