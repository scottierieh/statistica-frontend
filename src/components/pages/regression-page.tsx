'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet } from '@/lib/example-datasets';
import { exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { Sigma, FlaskConical, MoveRight, BarChart as BarChartIcon, Settings, FileSearch, Users, Repeat, CheckCircle, XCircle, AlertTriangle, HelpCircle, Bot, Loader2, TrendingUp, Target, Layers, BookOpen, Zap, Lightbulb } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import Image from 'next/image';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';

interface RegressionMetrics {
    r2: number;
    adj_r2: number;
    rmse: number;
    mae: number;
    mse: number;
}
interface RegressionResultsData {
    model_name: string;
    model_type: string;
    features: string[];
    metrics: {
        all_data: RegressionMetrics;
    };
    diagnostics: {
        f_statistic?: number;
        f_pvalue?: number;
        durbin_watson?: number;
        vif?: { [key: string]: number };
        coefficient_tests?: {
            params: { [key: string]: number };
            pvalues: { [key: string]: number };
            bse: { [key: string]: number };
            tvalues: { [key: string]: number };
        };
        standardized_coefficients?: {
            params: { [key: string]: number };
            pvalues: { [key: string]: number };
            bse: { [key: string]: number };
            tvalues: { [key: string]: number };
        };
        normality_tests?: {
            jarque_bera: { statistic: number; p_value: number; };
            shapiro_wilk: { statistic: number; p_value: number; };
        };
        heteroscedasticity_tests?: {
            breusch_pagan: { statistic: number; p_value: number; };
        },
        specification_tests?: {
            reset: { statistic: number; p_value: number; };
        },
        anova_table?: any[];
        model_summary_data?: any[];
    };
    stepwise_log?: string[];
    interpretation?: string;
    n_dropped?: number;
    dropped_rows?: number[];
    prediction?: {
        x_value: number,
        y_value: number,
        neighbors?: any[]
    }
}

interface FullAnalysisResponse {
    results: RegressionResultsData;
    model_name: string;
    model_type: string;
    plot: string;
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results, modelType }: { results: RegressionResultsData, modelType: string }) => {
    const metrics = results.metrics.all_data;
    const fTestPValue = results.diagnostics?.f_pvalue;
    const isModelSignificant = fTestPValue !== undefined && fTestPValue < 0.05;

    const getR2Interpretation = (r2: number) => {
        if (r2 >= 0.75) return 'Excellent fit';
        if (r2 >= 0.50) return 'Good fit';
        if (r2 >= 0.25) return 'Moderate fit';
        return 'Weak fit';
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* R-squared Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                R-squared
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {metrics.r2.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getR2Interpretation(metrics.r2)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Adjusted R-squared Card */}
            {modelType !== 'simple' && (
                <Card>
                    <CardContent className="p-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Adjusted R²
                                </p>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="text-2xl font-semibold">
                                {metrics.adj_r2.toFixed(4)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Accounts for predictors
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* RMSE Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                RMSE
                            </p>
                            <BarChartIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {metrics.rmse.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Prediction error
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* F-test Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Model Significance
                            </p>
                            <Sigma className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${!isModelSignificant ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {fTestPValue !== undefined ? (fTestPValue < 0.001 ? '<0.001' : fTestPValue.toFixed(4)) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {fTestPValue !== undefined ? (isModelSignificant ? 'Significant' : 'Not Significant') : 'p-value'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component with missing value check
const RegressionOverview = ({ modelType, targetVar, features, data, selectionMethod }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Helper function to check if value is missing
        const isMissing = (value: any) => {
            return value == null || value === '' || 
                   (typeof value === 'number' && isNaN(value)) ||
                   (typeof value === 'string' && value.toLowerCase() === 'nan');
        };
        
        // Model type and variables
        if (targetVar) {
            const modelTypeLabel = modelType === 'simple' ? 'Simple Linear' : 
                                  modelType === 'multiple' ? 'Multiple Linear' : 
                                  'Polynomial';
            overview.push(`Model: ${modelTypeLabel} Regression`);
            overview.push(`Predicting ${targetVar} using ${features.length} feature${features.length > 1 ? 's' : ''}`);
        }

        // Missing value check
        if (data && data.length > 0 && targetVar && features.length > 0) {
            const allVars = [targetVar, ...features];
            const missingCount = data.filter((row: any) => 
                allVars.some(v => isMissing(row[v]))
            ).length;
            const validCount = data.length - missingCount;
            
            if (missingCount > 0) {
                overview.push(`⚠ Missing values: ${missingCount} row${missingCount > 1 ? 's' : ''} will be excluded (${validCount} valid observations)`);
            } else {
                overview.push(`✓ No missing values detected`);
            }
        }

        // Sample size with warnings
        const effectiveSize = data.length;
        if (effectiveSize < 30) {
            overview.push(`Sample size: ${effectiveSize} observations (⚠ Small sample)`);
        } else if (effectiveSize < 100) {
            overview.push(`Sample size: ${effectiveSize} observations (Moderate)`);
        } else {
            overview.push(`Sample size: ${effectiveSize} observations (Good)`);
        }

        // Selection method for multiple regression
        if (modelType === 'multiple' && selectionMethod !== 'none') {
            const methodLabels: { [key: string]: string } = {
                'forward': 'Forward Selection',
                'backward': 'Backward Elimination',
                'stepwise': 'Stepwise Regression'
            };
            overview.push(`Variable selection: ${methodLabels[selectionMethod]}`);
        }

        // Sample size vs predictors ratio for multiple regression
        if (modelType === 'multiple' && features.length > 0) {
            const ratio = Math.floor(effectiveSize / features.length);
            if (ratio < 10) {
                overview.push(`⚠ Only ${ratio} observations per predictor (low)`);
            } else if (ratio < 20) {
                overview.push(`${ratio} observations per predictor (moderate)`);
            } else {
                overview.push(`${ratio} observations per predictor (good)`);
            }
        }

        return overview;
    }, [modelType, targetVar, features, data, selectionMethod]);

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

const SimpleLinearIntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const regressionExample = exampleDatasets.find(d => d.id === 'regression-suite');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <TrendingUp className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Simple Linear Regression</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Model the linear relationship between two continuous variables
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Linear Relationship</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Find the best-fit straight line through your data points
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Single Predictor</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Use one independent variable to predict an outcome
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChartIcon className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Straight Line Fit</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Y = b₀ + b₁X equation describes the relationship
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
                            Use Simple Linear Regression when you want to understand the relationship between two 
                            continuous variables and make predictions. Perfect for finding linear trends and basic 
                            predictions, like predicting sales based on advertising spend or temperature based on altitude.
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
                                        <span><strong>Target variable (Y):</strong> Continuous outcome</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Feature variable (X):</strong> One predictor</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Relationship:</strong> Linear pattern expected</span>
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
                                        <span><strong>Slope (b₁):</strong> Change in Y per unit X</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>R²:</strong> % of variance explained</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>p-value:</strong> Relationship significance</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {regressionExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(regressionExample)} size="lg">
                                {regressionExample.icon && <regressionExample.icon className="mr-2 h-5 w-5" />}
                                Load Regression Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const MultipleLinearIntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const regressionExample = exampleDatasets.find(d => d.id === 'regression-suite');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Layers className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Multiple Linear Regression</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Predict outcomes using multiple predictor variables
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Users className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Multiple Predictors</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Use two or more variables to predict an outcome
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Control Effects</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Assess each predictor's unique contribution
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Bot className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Variable Selection</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Automatic selection of most important predictors
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
                            Use Multiple Linear Regression when you want to model a single outcome using multiple 
                            predictor variables. It assesses each predictor's independent contribution while controlling 
                            for others, helping you understand which variables are most important.
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
                                        <span><strong>Target variable:</strong> One continuous outcome</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Features:</strong> Two or more predictors</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> More cases than predictors</span>
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
                                        <span><strong>Coefficients:</strong> Unique contribution of each</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Adjusted R²:</strong> Accounts for predictors</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>VIF:</strong> Check multicollinearity</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {regressionExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(regressionExample)} size="lg">
                                {regressionExample.icon && <regressionExample.icon className="mr-2 h-5 w-5" />}
                                Load Regression Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const PolynomialIntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const regressionExample = exampleDatasets.find(d => d.id === 'regression-suite');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Repeat className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Polynomial Regression</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Model non-linear relationships with curved patterns
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Repeat className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Non-Linear Fit</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Capture curved and U-shaped relationships in data
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Curved Patterns</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Add polynomial terms (X², X³) for flexibility
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChartIcon className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Flexible Models</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Control curve complexity with degree parameter
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
                            Use Polynomial Regression when data shows curved or U-shaped patterns that a straight 
                            line can't capture. It adds polynomial terms (X², X³) to create more flexible curves, 
                            perfect for modeling growth curves, diminishing returns, or any non-linear relationship.
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
                                        <span><strong>Target variable:</strong> Continuous outcome</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Feature(s):</strong> One or more predictors</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Degree:</strong> 2 (quadratic) to 5 (quintic)</span>
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
                                        <span><strong>R²:</strong> Curve fit quality measure</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Plot:</strong> Visual check of curve fit</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Caution:</strong> High degrees may overfit</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {regressionExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(regressionExample)} size="lg">
                                {regressionExample.icon && <regressionExample.icon className="mr-2 h-5 w-5" />}
                                Load Regression Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface RegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    activeAnalysis: string; 
}

const renderSetupUI = (modelType: string, props: any) => {
    const { numericHeaders, availableFeatures, targetVar, setTargetVar, simpleFeatureVar, setSimpleFeatureVar, multipleFeatureVars, handleMultiFeatureSelectionChange, polyDegree, setPolyDegree, selectionMethod, setSelectionMethod } = props;
    switch (modelType) {
        case 'simple':
            return (
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Target Variable (Y)</Label>
                        <Select value={targetVar} onValueChange={setTargetVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map((h:string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div>
                        <Label>Feature Variable (X)</Label>
                        <Select value={simpleFeatureVar} onValueChange={setSimpleFeatureVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{availableFeatures.map((h:string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                </div>
            );
        case 'multiple':
            return (
                 <div className="grid md:grid-cols-2 gap-4">
                     <div>
                        <Label>Target Variable (Y)</Label>
                        <Select value={targetVar} onValueChange={setTargetVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map((h:string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                         <div className="mt-4">
                            <Label>Variable Selection Method</Label>
                            <Select value={selectionMethod} onValueChange={setSelectionMethod}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Enter (All Selected)</SelectItem>
                                    <SelectItem value="forward">Forward Selection</SelectItem>
                                    <SelectItem value="backward">Backward Elimination</SelectItem>
                                    <SelectItem value="stepwise">Stepwise Regression</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="md:col-span-1">
                        <Label>Feature Variables (X)</Label>
                        <ScrollArea className="h-32 border rounded-md p-4">
                            <div className="grid grid-cols-2 gap-2">
                                {availableFeatures.map((h:string) => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`iv-${h}`} checked={multipleFeatureVars.includes(h)} onCheckedChange={(c) => handleMultiFeatureSelectionChange(h, !!c)} />
                                        <Label htmlFor={`iv-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            );
        case 'polynomial':
             return (
                 <div className="grid md:grid-cols-3 gap-4">
                    <div>
                        <Label>Target Variable (Y)</Label>
                        <Select value={targetVar} onValueChange={setTargetVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map((h:string) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div className="md:col-span-1">
                        <Label>Feature Variable(s)</Label>
                        <ScrollArea className="h-24 border rounded-md p-2">
                            <div className="grid grid-cols-1 gap-2">
                                {availableFeatures.map((h:string) => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`iv-${h}`} checked={multipleFeatureVars.includes(h)} onCheckedChange={(c) => handleMultiFeatureSelectionChange(h, !!c)} />
                                        <Label htmlFor={`iv-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    <div>
                        <Label>Polynomial Degree</Label>
                        <Input type="number" value={polyDegree} onChange={e => setPolyDegree(Number(e.target.value))} min="2" max="5"/>
                    </div>
                </div>
            );
        default:
            return null;
    }
}

export default function RegressionPage({ data, numericHeaders, onLoadExample, activeAnalysis }: RegressionPageProps) {
    const { toast } = useToast();
    const [targetVar, setTargetVar] = useState<string | undefined>(numericHeaders[numericHeaders.length - 1]);
    const [view, setView] = useState('intro');

    const modelType = useMemo(() => activeAnalysis.replace('regression-', ''), [activeAnalysis]);
    const [selectionMethod, setSelectionMethod] = useState('none');

    // States for different models
    const [simpleFeatureVar, setSimpleFeatureVar] = useState<string | undefined>(numericHeaders[0]);
    const [multipleFeatureVars, setMultipleFeatureVars] = useState<string[]>(numericHeaders.slice(0, numericHeaders.length - 1));
    
    // Simple regression prediction state
    const [predictXValue, setPredictXValue] = useState<number | ''>('');
    const [predictedYValue, setPredictedYValue] = useState<number | null>(null);
    
    // Model specific params
    const [polyDegree, setPolyDegree] = useState(2);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const allHeaders = useMemo(() => numericHeaders, [numericHeaders]);

    const availableFeatures = useMemo(() => numericHeaders.filter(h => h !== targetVar), [numericHeaders, targetVar]);
    
    const currentFeatures = useMemo(() => {
        if (modelType === 'simple') return simpleFeatureVar ? [simpleFeatureVar] : [];
        return multipleFeatureVars;
    }, [modelType, simpleFeatureVar, multipleFeatureVars]);
    
    useEffect(() => {
        const newTarget = numericHeaders[numericHeaders.length - 1];
        setTargetVar(newTarget);
        
        const initialFeatures = numericHeaders.filter(h => h !== newTarget);
        setSimpleFeatureVar(initialFeatures[0])
        setMultipleFeatureVars(initialFeatures);

        setAnalysisResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [data, numericHeaders]);
    
    useEffect(() => {
      setAnalysisResult(null); // Reset results when model type changes
    }, [modelType])

    const handleMultiFeatureSelectionChange = (header: string, checked: boolean) => {
        setMultipleFeatureVars(prev => checked ? [...prev, header] : prev.filter(v => v !== header));
    };
    
    const handleAnalysis = useCallback(async (predictValue?: number) => {
        if (!targetVar) {
            toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a target variable.'});
            return;
        }

        let features: string[] = [];
        let params: any = { data, targetVar, modelType, selectionMethod, test_size: 0 };

        switch (modelType) {
            case 'simple':
                if (!simpleFeatureVar) {
                    toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select a feature variable.'});
                    return;
                }
                features = [simpleFeatureVar];
                if (typeof predictValue === 'number') {
                    params.predict_x = predictValue;
                }
                break;
            case 'multiple':
            case 'polynomial':
                if (multipleFeatureVars.length < 1) {
                    toast({variant: 'destructive', title: 'Variable Selection Error', description: 'Please select at least one feature.'});
                    return;
                }
                features = multipleFeatureVars;
                if (modelType === 'polynomial') params.degree = polyDegree;
                break;
        }

        params.features = features;

        setIsLoading(true);
        if (typeof predictValue !== 'number') {
             setAnalysisResult(null);
             setPredictedYValue(null);
        }
        
        try {
            const response = await fetch('/api/analysis/regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            if(result.results.prediction) {
                setPredictedYValue(result.results.prediction.y_value);
            }

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'Analysis Error', description: e.message})
            setAnalysisResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, targetVar, modelType, simpleFeatureVar, multipleFeatureVars, polyDegree, selectionMethod, toast]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    
    useEffect(() => {
        setView(canRun ? 'main' : 'intro');
    }, [canRun]);

    const introPages: { [key: string]: React.FC<any> } = {
        simple: SimpleLinearIntroPage,
        multiple: MultipleLinearIntroPage,
        polynomial: PolynomialIntroPage
    };
    const IntroComponent = introPages[modelType];

    if (!IntroComponent || view === 'intro' || !canRun) {
        return <IntroComponent onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;
    const coefficientTableData = results?.diagnostics?.coefficient_tests ? Object.entries(results.diagnostics.coefficient_tests.params).map(([key, value]) => ({
        key: key,
        coefficient: value,
        stdError: results.diagnostics!.coefficient_tests!.bse?.[key],
        tValue: results.diagnostics!.coefficient_tests!.tvalues?.[key],
        pValue: results.diagnostics!.coefficient_tests!.pvalues?.[key],
    })) : [];

    const durbinWatson = results?.diagnostics?.durbin_watson;
    const dwMet = durbinWatson !== undefined && durbinWatson >= 1.5 && durbinWatson <= 2.5;

    const bpTest = results?.diagnostics?.heteroscedasticity_tests?.breusch_pagan;
    const bpMet = bpTest !== undefined && bpTest.p_value > 0.05;

    const swTest = results?.diagnostics?.normality_tests?.shapiro_wilk;
    const swMet = swTest !== undefined && swTest.p_value > 0.05;
    
    const resetTest = results?.diagnostics?.specification_tests?.reset;
    const resetMet = resetTest !== undefined && resetTest.p_value > 0.05;
    
    const fTestPValue = results?.diagnostics?.f_pvalue;
    const fTestMet = fTestPValue !== undefined && fTestPValue < 0.05;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">{modelType.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())} Regression Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>
                        Configure your regression model and run the analysis
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {renderSetupUI(modelType, { numericHeaders, availableFeatures, targetVar, setTargetVar, simpleFeatureVar, setSimpleFeatureVar, multipleFeatureVars, handleMultiFeatureSelectionChange, polyDegree, setPolyDegree, selectionMethod, setSelectionMethod })}
                    
                    {/* Overview Component */}
                    <RegressionOverview 
                        modelType={modelType}
                        targetVar={targetVar}
                        features={currentFeatures}
                        data={data}
                        selectionMethod={selectionMethod}
                    />
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={() => handleAnalysis()} disabled={isLoading || !targetVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && results && (
                <div className="space-y-4">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} modelType={modelType} />
                    
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
                                    <TrendingUp className="h-5 w-5 text-primary" />
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
                                            else if (title.includes('Key Findings') || title.includes('Statistical')) icon = Lightbulb;
                                            else if (title.includes('Recommendations') || title.includes('Next Steps')) icon = BookOpen;
                                            
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
                                        
                                        if (idx === 0) {
                                            gradientClass = 'bg-gradient-to-br from-primary/5 to-primary/10';
                                            borderClass = 'border-primary/40';
                                            iconBgClass = 'bg-primary/10';
                                            iconColorClass = 'text-primary';
                                            bulletColorClass = 'text-primary';
                                        } else if (section.title.includes('Key Findings') || section.title.includes('Statistical')) {
                                            gradientClass = 'bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10';
                                            borderClass = 'border-blue-300 dark:border-blue-700';
                                            iconBgClass = 'bg-blue-500/10';
                                            iconColorClass = 'text-blue-600 dark:text-blue-400';
                                            bulletColorClass = 'text-blue-600 dark:text-blue-400';
                                        } else {
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
                            <CardTitle>Visualization</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {analysisResult.plot && (
                                <div className="max-w-5xl mx-auto">
                                    <Image 
                                        src={analysisResult.plot} 
                                        alt="Regression Diagnostics" 
                                        width={1000}
                                        height={833}
                                        className="w-full h-auto rounded-md border"
                                    />
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Model Performance */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Model Performance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Metric</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-medium">R-squared</TableCell>
                                        <TableCell className="text-right font-mono">{results.metrics.all_data.r2.toFixed(4)}</TableCell>
                                    </TableRow>
                                    {modelType !== 'simple' && (
                                        <TableRow>
                                            <TableCell className="font-medium">Adjusted R²</TableCell>
                                            <TableCell className="text-right font-mono">{results.metrics.all_data.adj_r2.toFixed(4)}</TableCell>
                                        </TableRow>
                                    )}
                                    <TableRow>
                                        <TableCell className="font-medium">RMSE</TableCell>
                                        <TableCell className="text-right font-mono">{results.metrics.all_data.rmse.toFixed(4)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-medium">MAE</TableCell>
                                        <TableCell className="text-right font-mono">{results.metrics.all_data.mae.toFixed(4)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter className="flex flex-col items-start gap-1 text-sm text-muted-foreground">
                            <p><strong>R²:</strong> 0-1 scale | &gt;0.75 Excellent | 0.50-0.75 Good | 0.25-0.50 Moderate | &lt;0.25 Weak</p>
                            {modelType !== 'simple' && (
                                <p><strong>Adjusted R²:</strong> R² adjusted for number of predictors (penalizes overfitting)</p>
                            )}
                            <p><strong>RMSE:</strong> Root Mean Squared Error | Lower is better | Same units as target variable</p>
                            <p><strong>MAE:</strong> Mean Absolute Error | Lower is better | More robust to outliers than RMSE</p>
                        </CardFooter>
                    </Card>

                    {/* Coefficients Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Coefficients</CardTitle>
                            <CardDescription>Model parameters and their statistical significance</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Variable</TableHead>
                                        <TableHead className="text-right">B (Unstandardized)</TableHead>
                                        {modelType !== 'polynomial' && (
                                            <TableHead className="text-right">β (Standardized)</TableHead>
                                        )}
                                        <TableHead className="text-right">Std. Error</TableHead>
                                        <TableHead className="text-right">t-value</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {coefficientTableData.map(row => {
                                        const standardizedCoeff = results?.diagnostics?.standardized_coefficients?.params?.[row.key];
                                        return (
                                            <TableRow key={row.key}>
                                                <TableCell className="font-medium">{row.key}</TableCell>
                                                <TableCell className="text-right font-mono">{row.coefficient.toFixed(4)}</TableCell>
                                                {modelType !== 'polynomial' && (
                                                    <TableCell className="text-right font-mono">
                                                        {row.key === 'const' ? '-' : 
                                                         standardizedCoeff !== undefined ? standardizedCoeff.toFixed(4) : 'N/A'}
                                                    </TableCell>
                                                )}
                                                <TableCell className="text-right font-mono">{row.stdError?.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{row.tValue?.toFixed(3)}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {row.pValue < 0.001 ? '<.001' : row.pValue?.toFixed(4)}
                                                    {getSignificanceStars(row.pValue)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter className="flex flex-col items-start gap-2">
                            <p className='text-sm text-muted-foreground'>
                                <strong>B (Unstandardized):</strong> Original scale coefficients showing actual unit changes
                            </p>
                            {modelType !== 'polynomial' && (
                                <p className='text-sm text-muted-foreground'>
                                    <strong>β (Standardized):</strong> Standardized coefficients for comparing relative importance across predictors
                                </p>
                            )}
                            <p className='text-sm text-muted-foreground'>
                                Significance: *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05
                            </p>
                        </CardFooter>
                    </Card>

                    {/* VIF (Multicollinearity) Table - Only for multiple/polynomial regression */}
                    {(modelType === 'multiple' || modelType === 'polynomial') && results?.diagnostics?.vif && Object.keys(results.diagnostics.vif).length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Multicollinearity Check (VIF)</CardTitle>
                                <CardDescription>Variance Inflation Factor - values above 10 indicate high multicollinearity</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Variable</TableHead>
                                            <TableHead className="text-right">VIF</TableHead>
                                            <TableHead className="text-right">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.diagnostics.vif)
                                            .filter(([key]) => key !== 'const')
                                            .map(([key, value]) => {
                                                const vif = value as number;
                                                const hasIssue = vif > 10;
                                                const isModerate = vif > 5 && vif <= 10;
                                                return (
                                                    <TableRow key={key}>
                                                        <TableCell className="font-medium">{key}</TableCell>
                                                        <TableCell className="text-right font-mono">{vif.toFixed(3)}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Badge variant={hasIssue ? 'destructive' : isModerate ? 'outline' : 'default'}>
                                                                {hasIssue ? 'High' : isModerate ? 'Moderate' : 'Low'}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                            <CardFooter>
                                <p className='text-sm text-muted-foreground'>
                                    VIF &lt; 5: Low multicollinearity | VIF 5-10: Moderate | VIF &gt; 10: High multicollinearity (problematic)
                                </p>
                            </CardFooter>
                        </Card>
                    )}

                    {/* Model Fit & Assumptions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Model Fit & Assumptions</CardTitle>
                            <CardDescription>Overall model fit and diagnostic tests for regression assumptions</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Test</TableHead>
                                        <TableHead>Purpose</TableHead>
                                        <TableHead className="text-right">Statistic</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                        <TableHead className="text-right">Result</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fTestPValue !== undefined && (
                                        <TableRow className="bg-muted/50">
                                            <TableCell className="font-semibold">F-test</TableCell>
                                            <TableCell className="font-medium">Overall Model Fit</TableCell>
                                            <TableCell className="font-mono text-right">{results?.diagnostics?.f_statistic?.toFixed(3)}</TableCell>
                                            <TableCell className="font-mono text-right">{fTestPValue < 0.001 ? '<.001' : fTestPValue.toFixed(4)}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={fTestMet ? 'default' : 'destructive'}>
                                                    {fTestMet ? "Significant" : "Not Significant"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {durbinWatson !== undefined && (
                                        <TableRow>
                                            <TableCell className="font-medium">Durbin-Watson</TableCell>
                                            <TableCell>Independence of Residuals</TableCell>
                                            <TableCell className="font-mono text-right">{durbinWatson.toFixed(3)}</TableCell>
                                            <TableCell className="text-right">-</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={dwMet ? 'default' : 'destructive'}>
                                                    {dwMet ? "Met" : "Not Met"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {bpTest && (
                                        <TableRow>
                                            <TableCell className="font-medium">Breusch-Pagan</TableCell>
                                            <TableCell>Homoscedasticity</TableCell>
                                            <TableCell className="font-mono text-right">{bpTest.statistic.toFixed(3)}</TableCell>
                                            <TableCell className="font-mono text-right">{bpTest.p_value < 0.001 ? '<.001' : bpTest.p_value.toFixed(4)}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={bpMet ? 'default' : 'destructive'}>
                                                    {bpMet ? "Met" : "Not Met"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {swTest && (
                                        <TableRow>
                                            <TableCell className="font-medium">Shapiro-Wilk</TableCell>
                                            <TableCell>Normality of Residuals</TableCell>
                                            <TableCell className="font-mono text-right">{swTest.statistic.toFixed(3)}</TableCell>
                                            <TableCell className="font-mono text-right">{swTest.p_value < 0.001 ? '<.001' : swTest.p_value.toFixed(4)}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={swMet ? 'default' : 'destructive'}>
                                                    {swMet ? "Met" : "Not Met"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {resetTest && (
                                        <TableRow>
                                            <TableCell className="font-medium">Ramsey RESET</TableCell>
                                            <TableCell>Model Specification</TableCell>
                                            <TableCell className="font-mono text-right">{resetTest.statistic.toFixed(3)}</TableCell>
                                            <TableCell className="font-mono text-right">{resetTest.p_value < 0.001 ? '<.001' : resetTest.p_value.toFixed(4)}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={resetMet ? 'default' : 'destructive'}>
                                                    {resetMet ? "Correct" : "Incorrect"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
                            <div className="space-y-1">
                                <p><strong>F-test:</strong> p &lt; 0.05 means the model explains significant variance (at least one predictor is meaningful)</p>
                                <p><strong>Durbin-Watson:</strong> 1.5-2.5 = No autocorrelation | &lt;1.5 = Positive autocorrelation | &gt;2.5 = Negative autocorrelation</p>
                                <p><strong>Breusch-Pagan:</strong> p &gt; 0.05 = Equal variance (homoscedasticity) | p &lt; 0.05 = Unequal variance (heteroscedasticity)</p>
                                <p><strong>Shapiro-Wilk:</strong> p &gt; 0.05 = Residuals are normally distributed | p &lt; 0.05 = Non-normal residuals</p>
                                <p><strong>Ramsey RESET:</strong> p &gt; 0.05 = Correct model specification | p &lt; 0.05 = Missing variables or wrong functional form</p>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            )}

            {!isLoading && !analysisResult && (
                <div className="text-center text-muted-foreground py-10">
                    <Layers className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Configure your model and click 'Run Analysis' to see results.</p>
                </div>
            )}
        </div>
    );
}

