
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, TrendingUp, AlertTriangle, CheckCircle, Bot, MoveRight, HelpCircle, Settings, FileSearch, BarChart, FlaskConical } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
            bse?: { [key: string]: number };
            tvalues?: { [key: string]: number };
        },
        anova_table?: Array<{
            source: string;
            sum_sq: number;
            df: number;
            F: number;
            'PR(>F)': number;
        }>;
        normality_tests?: {
            jarque_bera: { statistic: number; p_value: number; };
            shapiro_wilk: { statistic: number; p_value: number; };
        };
        heteroscedasticity_tests?: {
            breusch_pagan: { statistic: number; p_value: number; };
        },
        specification_tests?: {
            reset: { statistic: number; p_value: number; };
        };
        influence_tests?: {
            max_cooks_d: number;
        }
    };
    stepwise_log?: string[];
    interpretation?: string;
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

const SimpleLinearIntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const regressionExample = exampleDatasets.find(d => d.id === 'regression-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center p-8">
                    <CardTitle className="font-headline text-4xl font-bold">Simple Linear Regression</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground">Model the relationship between two continuous variables.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Simple Linear Regression?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">This is the simplest form of regression, used to understand the relationship between a single independent variable (predictor) and a single dependent variable (outcome). It's perfect for finding a linear trend and making basic predictions.</p>
                    </div>
                     <div className="flex justify-center">
                           {regressionExample && (
                                <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(regressionExample)}>
                                    <regressionExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">{regressionExample.name}</h4>
                                        <p className="text-xs text-muted-foreground">{regressionExample.description}</p>
                                    </div>
                                </Card>
                            )}
                        </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Target Variable (Y):</strong> The outcome you want to predict.</li>
                                <li><strong>Feature Variable (X):</strong> The single variable you believe influences the target.</li>
                            </ol>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                            <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Equation:</strong> Y = b0 + b1X. b1 is the slope, showing how much Y changes for a one-unit change in X.</li>
                                <li><strong>R-squared (R²):</strong> The percentage of variance in Y explained by X.</li>
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
const MultipleLinearIntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const regressionExample = exampleDatasets.find(d => d.id === 'regression-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-4xl">
                 <CardHeader className="text-center p-8">
                    <CardTitle className="font-headline text-4xl font-bold">Multiple Linear Regression</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground">Predict an outcome based on the linear relationship with two or more predictor variables.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Multiple Linear Regression?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">This is an extension of simple linear regression. It allows you to model a single outcome variable using multiple predictor variables, assessing the independent contribution of each predictor while controlling for the others.</p>
                    </div>
                     <div className="flex justify-center">
                           {regressionExample && (
                                <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(regressionExample)}>
                                    <regressionExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">{regressionExample.name}</h4>
                                        <p className="text-xs text-muted-foreground">{regressionExample.description}</p>
                                    </div>
                                </Card>
                            )}
                        </div>
                     <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Target Variable (Y):</strong> The single outcome variable to predict.</li>
                                <li><strong>Feature Variables (X):</strong> Select two or more predictor variables.</li>
                                <li><strong>Variable Selection:</strong> Optionally use Forward, Backward, or Stepwise methods to automatically select the most impactful features.</li>
                            </ol>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                            <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Coefficients:</strong> Each coefficient represents the change in Y for a one-unit change in its corresponding X, holding all other predictors constant.</li>
                                <li><strong>Adjusted R-squared:</strong> A modified version of R² that accounts for the number of predictors, providing a more accurate measure of model fit.</li>
                                <li><strong>VIF (Variance Inflation Factor):</strong> Checks for multicollinearity. Values above 5 or 10 suggest a predictor is highly correlated with others and may be redundant.</li>
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

const PolynomialIntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const regressionExample = exampleDatasets.find(d => d.id === 'regression-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center p-8">
                    <CardTitle className="font-headline text-4xl font-bold">Polynomial Regression</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground">Fit a non-linear curve to capture more complex relationships.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Polynomial Regression?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">When the relationship between your variables is not linear, polynomial regression can fit a curve (quadratic, cubic, etc.) to the data. This is useful for capturing more nuanced patterns, but be careful of overfitting.</p>
                    </div>
                     <div className="flex justify-center">
                           {regressionExample && (
                                <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(regressionExample)}>
                                    <regressionExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">{regressionExample.name}</h4>
                                        <p className="text-xs text-muted-foreground">{regressionExample.description}</p>
                                    </div>
                                </Card>
                            )}
                        </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Target Variable (Y):</strong> The outcome you want to predict.</li>
                                <li><strong>Feature Variable(s) (X):</strong> One or more predictors. Polynomial terms will be generated automatically.</li>
                                <li><strong>Degree:</strong> The degree of the polynomial (e.g., 2 for quadratic, 3 for cubic). Higher degrees can fit more complex curves but risk overfitting.</li>
                            </ol>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                            <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>R-squared (R²):</strong> Measures how well the curve fits the data. Be cautious, as higher degrees can easily overfit the data.</li>
                                <li><strong>Coefficients:</strong> Interpreting individual polynomial coefficients is complex. It's often better to focus on the overall model fit and the shape of the curve in the diagnostic plot.</li>
                                <li><strong>Actual vs. Predicted Plot:</strong> This is key to seeing if the generated curve accurately captures the trend in your data points.</li>
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

const InterpretationDisplay = ({ interpretation, f_pvalue }: { interpretation?: string, f_pvalue?: number }) => {
    if (!interpretation) return null;

    const isSignificant = f_pvalue !== undefined && f_pvalue < 0.05;
    const icon = isSignificant ? <CheckCircle className="w-5 h-5 text-green-600"/> : <AlertTriangle className="w-5 h-5 text-yellow-600"/>;
    const title = isSignificant ? "Model is Statistically Significant" : "Model is Not Statistically Significant";
    const variant = isSignificant ? "default" : "destructive";

    return (
        <Alert variant={variant as any}>
            {icon}
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription className="text-sm whitespace-pre-line">{interpretation}</AlertDescription>
        </Alert>
    );
};

const ResultDisplay = ({ results }: { results: RegressionResultsData }) => {
    const diagnostics = results.diagnostics;
    
    return (
         <div className="space-y-4">
            <InterpretationDisplay interpretation={results.interpretation} f_pvalue={diagnostics?.f_pvalue} />
            
            {/* 회귀 계수 테이블 추가 */}
            {diagnostics?.coefficient_tests && (
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Regression Coefficients</CardTitle>
                        <CardDescription>Parameter estimates with standard errors, t-values, and p-values</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Variable</TableHead>
                                    <TableHead className="text-right">Coefficient</TableHead>
                                    <TableHead className="text-right">Std Error</TableHead>
                                    <TableHead className="text-right">t-value</TableHead>
                                    <TableHead className="text-right">p-value</TableHead>
                                    <TableHead>Significance</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Object.keys(diagnostics.coefficient_tests.params).map((variable) => {
                                    const coef = diagnostics.coefficient_tests?.params[variable];
                                    const pval = diagnostics.coefficient_tests?.pvalues?.[variable];
                                    const bse = diagnostics.coefficient_tests?.bse?.[variable];
                                    const tval = diagnostics.coefficient_tests?.tvalues?.[variable];
                                    const isSignificant = pval !== undefined && pval < 0.05;
                                    
                                    return (
                                        <TableRow key={variable}>
                                            <TableCell className="font-medium">{variable}</TableCell>
                                            <TableCell className="text-right font-mono">{coef?.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{bse?.toFixed(4)}</TableCell>
                                            <TableCell className="text-right font-mono">{tval?.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{pval && pval < 0.001 ? '<.001' : pval?.toFixed(4)}</TableCell>
                                            <TableCell>
                                                {isSignificant ? <Badge>Significant</Badge> : <Badge variant="outline">Not Sig.</Badge>}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* ANOVA 테이블 추가 */}
            {diagnostics?.anova_table && diagnostics.anova_table.length > 0 && (
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>ANOVA Table</CardTitle>
                        <CardDescription>Analysis of Variance for the regression model</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Source</TableHead>
                                    <TableHead className="text-right">Sum of Squares</TableHead>
                                    <TableHead className="text-right">df</TableHead>
                                    <TableHead className="text-right">F-statistic</TableHead>
                                    <TableHead className="text-right">p-value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {diagnostics.anova_table.map((row, idx) => (
                                    <TableRow key={idx}>
                                        <TableCell className="font-medium">{row.source}</TableCell>
                                        <TableCell className="text-right font-mono">{row.sum_sq?.toFixed(4)}</TableCell>
                                        <TableCell className="text-right font-mono">{row.df?.toFixed(0)}</TableCell>
                                        <TableCell className="text-right font-mono">{row.F ? row.F.toFixed(4) : '-'}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {row['PR(>F)'] !== undefined && row['PR(>F)'] !== null 
                                                ? (row['PR(>F)'] < 0.001 ? '<.001' : row['PR(>F)'].toFixed(4))
                                                : '-'}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <div className="grid lg:grid-cols-2 gap-4">
                <Card>
                    <CardHeader><CardTitle>Model Performance</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                <TableRow><TableCell>R-squared</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.r2.toFixed(4)}</TableCell></TableRow>
                                <TableRow><TableCell>Adj. R-squared</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.adj_r2.toFixed(4)}</TableCell></TableRow>
                                <TableRow><TableCell>F-statistic</TableCell><TableCell className="text-right font-mono">{diagnostics?.f_statistic?.toFixed(2)}</TableCell></TableRow>
                                <TableRow><TableCell>p-value (F-test)</TableCell><TableCell className="text-right font-mono">{diagnostics?.f_pvalue && diagnostics.f_pvalue < 0.001 ? '<.001' : diagnostics?.f_pvalue?.toFixed(4)}</TableCell></TableRow>
                                <TableRow><TableCell>RMSE</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.rmse.toFixed(3)}</TableCell></TableRow>
                                <TableRow><TableCell>MAE</TableCell><TableCell className="text-right font-mono">{results.metrics.all_data.mae.toFixed(3)}</TableCell></TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Diagnostic Tests</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                             <TableHeader>
                                <TableRow>
                                    <TableHead>Test</TableHead>
                                    <TableHead className="text-right">Statistic</TableHead>
                                    <TableHead className="text-right">p-value</TableHead>
                                    <TableHead>Result</TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {diagnostics?.heteroscedasticity_tests?.breusch_pagan && (
                                    <TableRow>
                                        <TableCell>Breusch-Pagan Test</TableCell>
                                        <TableCell className="font-mono text-right">{diagnostics.heteroscedasticity_tests.breusch_pagan.statistic.toFixed(2)}</TableCell>
                                        <TableCell className="font-mono text-right">{diagnostics.heteroscedasticity_tests.breusch_pagan.p_value.toFixed(4)}</TableCell>
                                        <TableCell>{diagnostics.heteroscedasticity_tests.breusch_pagan.p_value > 0.05 ? <Badge>Homoscedasticity ✓</Badge> : <Badge variant="destructive">Heteroscedasticity ✗</Badge>}</TableCell>
                                    </TableRow>
                                )}
                                {diagnostics?.normality_tests?.shapiro_wilk && (
                                    <TableRow>
                                        <TableCell>Shapiro-Wilk (residuals)</TableCell>
                                        <TableCell className="font-mono text-right">{diagnostics.normality_tests.shapiro_wilk.statistic.toFixed(3)}</TableCell>
                                        <TableCell className="font-mono text-right">{diagnostics.normality_tests.shapiro_wilk.p_value.toFixed(4)}</TableCell>
                                        <TableCell>{diagnostics.normality_tests.shapiro_wilk.p_value > 0.05 ? <Badge>Normality ✓</Badge> : <Badge variant="destructive">Non-normal ✗</Badge>}</TableCell>
                                    </TableRow>
                                )}
                                {diagnostics?.specification_tests?.reset && (
                                    <TableRow>
                                        <TableCell>RESET Test</TableCell>
                                        <TableCell className="font-mono text-right">{diagnostics.specification_tests.reset.statistic.toFixed(2)}</TableCell>
                                        <TableCell className="font-mono text-right">{diagnostics.specification_tests.reset.p_value.toFixed(4)}</TableCell>
                                        <TableCell>{diagnostics.specification_tests.reset.p_value > 0.05 ? <Badge>No specification error ✓</Badge> : <Badge variant="destructive">Mis-specified ✗</Badge>}</TableCell>
                                    </TableRow>
                                )}
                                {diagnostics?.influence_tests && diagnostics.influence_tests.max_cooks_d !== undefined && (
                                    <TableRow>
                                        <TableCell>Cook's Distance (max)</TableCell>
                                        <TableCell className="font-mono text-right">{diagnostics.influence_tests.max_cooks_d.toFixed(3)}</TableCell>
                                        <TableCell>-</TableCell>
                                        <TableCell>{diagnostics.influence_tests.max_cooks_d < 0.5 ? <Badge>No influential outliers ✓</Badge> : <Badge variant="destructive">Influential outlier(s) ✗</Badge>}</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                
                {/* VIF 테이블 - 단순회귀에서도 표시하도록 조건 수정 */}
                {diagnostics?.vif && Object.keys(diagnostics.vif).filter(k => k !== 'const').length > 0 && (
                    <Card className="lg:col-span-2">
                        <CardHeader>
                            <CardTitle>Multicollinearity (VIF)</CardTitle>
                            <CardDescription>Variance Inflation Factor. Values &gt; 5 suggest potential multicollinearity.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Variable</TableHead>
                                        <TableHead className="text-right">VIF</TableHead>
                                        <TableHead>Assessment</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(diagnostics.vif).filter(([key]) => key !== 'const').map(([variable, vif]) => (
                                        <TableRow key={variable}>
                                            <TableCell className="font-medium">{variable}</TableCell>
                                            <TableCell className={`text-right font-mono ${vif > 5 ? 'text-destructive font-bold' : ''}`}>
                                                {typeof vif === 'number' ? vif.toFixed(3) : 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {typeof vif === 'number' ? (
                                                    vif > 10 ? <Badge variant="destructive">High</Badge> :
                                                    vif > 5 ? <Badge variant="outline">Moderate</Badge> :
                                                    <Badge>Low</Badge>
                                                ) : '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}

interface RegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    activeAnalysis: string; 
}

export default function RegressionPage({ data, numericHeaders, onLoadExample, activeAnalysis }: RegressionPageProps) {
    const modelType = activeAnalysis === 'simple-regression' ? 'simple' : activeAnalysis === 'multiple-regression' ? 'multiple' : 'polynomial';
    const [view, setView] = useState<'intro' | 'analysis'>('intro');
    const [targetVar, setTargetVar] = useState<string>('');
    const [simpleFeatureVar, setSimpleFeatureVar] = useState<string>('');
    const [multipleFeatureVars, setMultipleFeatureVars] = useState<string[]>([]);
    const [selectionMethod, setSelectionMethod] = useState<string>('enter');
    const [polynomialDegree, setPolynomialDegree] = useState<number>(2);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const { toast } = useToast();

    const handleAnalysis = useCallback(async () => {
        setIsLoading(true);
        setAnalysisResult(null);

        const payload: any = {
            data: data.rows,
            targetVar,
            modelType,
        };

        if (modelType === 'simple') {
            payload.features = [simpleFeatureVar];
        } else if (modelType === 'multiple') {
            payload.features = multipleFeatureVars;
            payload.selectionMethod = selectionMethod;
        } else if (modelType === 'polynomial') {
            payload.features = multipleFeatureVars;
            payload.degree = polynomialDegree;
        }

        try {
            const response = await fetch('/api/stats/regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Analysis failed');
            }

            const result = await response.json();
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "Regression analysis has been successfully completed." });
        } catch (error: any) {
            toast({ title: "Analysis Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [data, targetVar, simpleFeatureVar, multipleFeatureVars, selectionMethod, polynomialDegree, modelType, toast]);

    const renderIntroPage = () => {
        switch (modelType) {
            case 'simple':
                return <SimpleLinearIntroPage onStart={() => setView('analysis')} onLoadExample={onLoadExample} />;
            case 'multiple':
                return <MultipleLinearIntroPage onStart={() => setView('analysis')} onLoadExample={onLoadExample} />;
            case 'polynomial':
                return <PolynomialIntroPage onStart={() => setView('analysis')} onLoadExample={onLoadExample} />;
            default:
                return null;
        }
    };

    if (view === 'intro') {
        return renderIntroPage();
    }

    const renderSetupUI = () => {
        switch (modelType) {
            case 'simple':
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>Target Variable (Y)</Label>
                            <Select value={targetVar} onValueChange={setTargetVar}>
                                <SelectTrigger><SelectValue placeholder="Select target variable"/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Feature Variable (X)</Label>
                            <Select value={simpleFeatureVar} onValueChange={setSimpleFeatureVar}>
                                <SelectTrigger><SelectValue placeholder="Select feature variable"/></SelectTrigger>
                                <SelectContent>{numericHeaders.filter(h => h !== targetVar).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                );
            case 'multiple':
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>Target Variable (Y)</Label>
                            <Select value={targetVar} onValueChange={setTargetVar}>
                                <SelectTrigger><SelectValue placeholder="Select target variable"/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Feature Variables (X) - Select Multiple</Label>
                            <ScrollArea className="h-40 border rounded-md p-2">
                                {numericHeaders.filter(h => h !== targetVar).map(header => (
                                    <div key={header} className="flex items-center space-x-2 py-1">
                                        <Checkbox
                                            checked={multipleFeatureVars.includes(header)}
                                            onCheckedChange={(checked) => {
                                                if (checked) setMultipleFeatureVars([...multipleFeatureVars, header]);
                                                else setMultipleFeatureVars(multipleFeatureVars.filter(v => v !== header));
                                            }}
                                        />
                                        <label className="text-sm">{header}</label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                        <div>
                            <Label>Variable Selection Method</Label>
                            <Select value={selectionMethod} onValueChange={setSelectionMethod}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="enter">Enter (No Selection)</SelectItem>
                                    <SelectItem value="forward">Forward Selection</SelectItem>
                                    <SelectItem value="backward">Backward Elimination</SelectItem>
                                    <SelectItem value="stepwise">Stepwise Selection</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );
            case 'polynomial':
                return (
                    <div className="space-y-4">
                        <div>
                            <Label>Target Variable (Y)</Label>
                            <Select value={targetVar} onValueChange={setTargetVar}>
                                <SelectTrigger><SelectValue placeholder="Select target variable"/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Feature Variables (X)</Label>
                            <ScrollArea className="h-40 border rounded-md p-2">
                                {numericHeaders.filter(h => h !== targetVar).map(header => (
                                    <div key={header} className="flex items-center space-x-2 py-1">
                                        <Checkbox
                                            checked={multipleFeatureVars.includes(header)}
                                            onCheckedChange={(checked) => {
                                                if (checked) setMultipleFeatureVars([...multipleFeatureVars, header]);
                                                else setMultipleFeatureVars(multipleFeatureVars.filter(v => v !== header));
                                            }}
                                        />
                                        <label className="text-sm">{header}</label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                        <div>
                            <Label>Polynomial Degree</Label>
                            <Input type="number" min={2} max={5} value={polynomialDegree} onChange={(e) => setPolynomialDegree(parseInt(e.target.value) || 2)}/>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };
    
    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">{modelType.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())} Regression</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {renderSetupUI()}
                </CardContent>
              <CardFooter className="flex justify-end">
                    <Button onClick={() => handleAnalysis()} disabled={isLoading || !targetVar || (modelType === 'simple' ? !simpleFeatureVar : multipleFeatureVars.length === 0)}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
              </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {analysisResult && (
                <>
                    <ResultDisplay results={analysisResult.results} />
                    {analysisResult.plot && (
                         <Card>
                            <CardHeader><CardTitle>Diagnostic Plots</CardTitle></CardHeader>
                            <CardContent><Image src={analysisResult.plot} alt="Regression Diagnostics" width={1500} height={1200} className="w-full rounded-md border"/></CardContent>
                        </Card>
                    )}
                </>
            )}

            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <TrendingUp className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select variables and click 'Run Analysis' to see the results.</p>
                </div>
            )}
        </div>
    );
}

