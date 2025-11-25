'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sigma, Loader2, Scaling, HelpCircle, Settings, FileSearch, TrendingUp, CheckCircle, Target, BarChart, BookOpen, FileText, Lightbulb } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';

interface SummaryTableData {
    caption: string | null;
    data: string[][];
}

interface GlmResults {
    model_summary_data: SummaryTableData[];
    aic: number;
    bic: number;
    log_likelihood: number;
    deviance: number;
    pseudo_r2: number;
    coefficients: {
        variable: string;
        coefficient: number;
        exp_coefficient?: number;
        p_value: number;
        conf_int_lower: number;
        conf_int_upper: number;
        exp_conf_int_lower?: number;
        exp_conf_int_upper?: number;
    }[];
    family: string;
    interpretation?: string;
}

const getSignificanceStars = (p: number) => {
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

// Overview component matching Robust Regression style
const GlmOverview = ({ family, linkFunction, targetVar, features, dataLength }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Model configuration
        if (targetVar && features.length > 0) {
            overview.push(`Predicting ${targetVar} using ${features.length} predictor${features.length > 1 ? 's' : ''}`);
            overview.push(`Model family: ${family} with ${linkFunction || 'default'} link`);
        } else if (targetVar) {
            overview.push(`Predicting ${targetVar} (no predictors selected)`);
        } else {
            overview.push('Select target variable and predictors');
        }

        // Sample size
        if (dataLength < 30) {
            overview.push(`Sample size: ${dataLength} (⚠ Small - results may be unstable)`);
        } else if (dataLength < 100) {
            overview.push(`Sample size: ${dataLength} (Moderate)`);
        } else {
            overview.push(`Sample size: ${dataLength} (Good)`);
        }
        
        // Model info based on family
        if (family === 'binomial') {
            overview.push('Binary outcome modeling with logit/probit link');
            overview.push('Coefficients interpreted as log-odds (or odds ratios)');
        } else if (family === 'poisson') {
            overview.push('Count data modeling with log link');
            overview.push('Suitable for non-negative integer outcomes');
        } else if (family === 'gamma') {
            overview.push('Continuous positive outcomes with skewed distribution');
            overview.push('Useful for highly right-skewed data');
        } else {
            overview.push('Linear regression with identity link');
            overview.push('Standard Gaussian distribution assumption');
        }
        
        overview.push('Estimation method: Maximum Likelihood');
        overview.push('Output: Coefficients with 95% confidence intervals');

        return overview;
    }, [family, linkFunction, targetVar, features, dataLength]);

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

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const glmExample = exampleDatasets.find(d => d.id === 'admission-data');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Scaling className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Generalized Linear Models</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Flexible extension of linear regression for various outcome distributions
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Scaling className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Multiple Distributions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Model binary, count, or continuous outcomes using appropriate distributions
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Link Functions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Connect linear predictors to outcome variables via link functions
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <CheckCircle className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Interpretable Results</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Clear coefficient interpretation with odds ratios for logistic models
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
                            Generalized Linear Models extend standard linear regression to handle different types of 
                            dependent variables. GLMs use a link function to connect the linear model to the outcome, 
                            allowing flexible modeling of binary outcomes (logistic), count data (Poisson), or other 
                            distributions while maintaining interpretable coefficients.
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
                                        <span><strong>Model family:</strong> Choose distribution (Binomial, Poisson, etc.)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Link function:</strong> Set automatically or customize</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Variables:</strong> Target outcome and predictor features</span>
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
                                        <span><strong>Coefficients:</strong> Effect sizes and significance levels</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>AIC/BIC:</strong> Model comparison criteria (lower is better)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Pseudo R²:</strong> Proportion of variance explained</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {glmExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(glmExample)} size="lg">
                                <TrendingUp className="mr-2" />
                                Load Admission Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface GlmPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function GlmPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: GlmPageProps) {
    const { toast } = useToast();
    const [showIntro, setShowIntro] = useState(data.length === 0);
    const [family, setFamily] = useState('gaussian');
    const [linkFunction, setLinkFunction] = useState<string | undefined>();
    const [targetVar, setTargetVar] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<GlmResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);

    const targetOptions = useMemo(() => {
        const binaryCategoricalHeaders = categoricalHeaders.filter(h => {
            const uniqueValues = new Set(data.map(row => row[h]));
            return uniqueValues.size === 2;
        });

        if (family === 'binomial') {
            return [...binaryCategoricalHeaders];
        }
        return numericHeaders;
    }, [family, numericHeaders, categoricalHeaders, data]);
    
    const featureOptions = useMemo(() => allHeaders.filter(h => h !== targetVar), [allHeaders, targetVar]);
    
    useEffect(() => {
        const newTarget = targetOptions[0];
        setTargetVar(newTarget);
        setFeatures(allHeaders.filter(h => h !== newTarget));
        setAnalysisResult(null);
        setShowIntro(data.length === 0);
    }, [family, data, allHeaders, targetOptions]);

    const linkFunctionOptions = useMemo(() => {
        switch (family) {
            case 'binomial':
                return ['logit', 'probit', 'cloglog', 'log'];
            case 'gamma':
                return ['log', 'inverse_power'];
            case 'gaussian':
                return ['identity', 'log'];
            default:
                return [];
        }
    }, [family]);
    
    useEffect(() => {
        if (linkFunctionOptions.length > 0 && !linkFunctionOptions.includes(linkFunction || '')) {
            setLinkFunction(linkFunctionOptions[0]);
        } else if (linkFunctionOptions.length === 0) {
            setLinkFunction(undefined);
        }
    }, [linkFunctionOptions, linkFunction]);

    const handleFeatureChange = (header: string, checked: boolean) => {
        setFeatures(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!targetVar || features.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a target variable and at least one feature.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch('/api/analysis/glm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, target_var: targetVar, features, family, link_function: linkFunction })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result: GlmResults = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('GLM Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message })
            setAnalysisResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, targetVar, features, family, linkFunction, toast]);
    
    const mainSummaryData = useMemo(() => {
        if (!analysisResult?.model_summary_data?.[0]?.data) return [];

        const summaryTable = analysisResult.model_summary_data[0].data;
        const items = [];
        const cleanValue = (val: string) => val.replace(/Q\("([^"]+)"\)/g, '$1');
        
        for (let i = 0; i < summaryTable.length; i++) {
            for (let j = 0; j < summaryTable[i].length; j += 2) {
                const key = summaryTable[i][j].replace(':', '');
                const value = summaryTable[i][j+1];
                if (key && value && key.trim() !== '') {
                    items.push({ key: key.trim(), value: cleanValue(value.trim()) });
                }
            }
        }
        return items;
    }, [analysisResult]);

    if (showIntro || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const results = analysisResult;
    const significantCoefficients = results?.coefficients.filter(c => c.p_value < 0.05).length || 0;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="font-headline">GLM Configuration</CardTitle>
                            <CardDescription>
                                Select model family, target variable, and features
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowIntro(true)}>
                            <HelpCircle className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-4 gap-4">
                        <div>
                            <Label>Model Family</Label>
                            <Select value={family} onValueChange={setFamily}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gaussian">Gaussian (Linear)</SelectItem>
                                    <SelectItem value="binomial">Binomial (Logit/Probit)</SelectItem>
                                    <SelectItem value="poisson">Poisson (Count)</SelectItem>
                                    <SelectItem value="gamma">Gamma (Skewed)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {linkFunctionOptions.length > 0 && (
                            <div>
                                <Label>Link Function</Label>
                                <Select value={linkFunction} onValueChange={setLinkFunction}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {linkFunctionOptions.map(link => <SelectItem key={link} value={link}>{link}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div>
                            <Label>Target Variable</Label>
                            <Select value={targetVar} onValueChange={setTargetVar}>
                                <SelectTrigger><SelectValue placeholder="Select target"/></SelectTrigger>
                                <SelectContent>{targetOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className={linkFunctionOptions.length > 0 ? "" : "md:col-span-2"}>
                            <Label>Features</Label>
                            <ScrollArea className="h-32 border rounded-md p-4">
                                {featureOptions.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`feat-${h}`} checked={features.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                        <Label htmlFor={`feat-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>

                    {/* Overview Component - Updated Style */}
                    {targetVar && features.length > 0 && (
                        <GlmOverview 
                            family={family}
                            linkFunction={linkFunction}
                            targetVar={targetVar}
                            features={features}
                            dataLength={data.length}
                        />
                    )}
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !targetVar || features.length === 0} size="lg">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Running Analysis...
                            </>
                        ) : (
                            <>
                                <Sigma className="mr-2 h-4 w-4" />
                                Run GLM Analysis
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
            
            {results && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="p-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Pseudo R²
                                        </p>
                                        <Target className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <p className="text-2xl font-semibold">
                                        {results.pseudo_r2.toFixed(4)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Variance explained
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            AIC
                                        </p>
                                        <BarChart className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <p className="text-2xl font-semibold">
                                        {results.aic.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Akaike Information
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            BIC
                                        </p>
                                        <BarChart className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <p className="text-2xl font-semibold">
                                        {results.bic.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Bayesian Information
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-muted-foreground">
                                            Significant
                                        </p>
                                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <p className="text-2xl font-semibold">
                                        {significantCoefficients}/{results.coefficients.length}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Coefficients (p &lt; 0.05)
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed Analysis - Matching other regression pages style */}
                    {results.interpretation && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2">
                                    <Scaling className="h-5 w-5 text-primary" />
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
                                            
                                            let icon = Scaling;
                                            if (title.includes('Overall')) icon = Scaling;
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
                                        if (Icon === Scaling) {
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

                    {/* Coefficients Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Coefficients</CardTitle>
                            <CardDescription>Effect estimates with confidence intervals and significance tests</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Variable</TableHead>
                                        <TableHead className="text-right">Coefficient</TableHead>
                                        {results.family !== 'gaussian' && <TableHead className="text-right">Exp(Coef)</TableHead>}
                                        <TableHead className="text-right">p-value</TableHead>
                                        <TableHead className="text-right">95% CI</TableHead>
                                        <TableHead className="text-center">Significance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.coefficients.map(c => {
                                        const isSignificant = c.p_value < 0.05;
                                        return (
                                            <TableRow key={c.variable}>
                                                <TableCell className="font-medium">{c.variable.replace(/Q\("([^"]+)"\)/g, '$1')}</TableCell>
                                                <TableCell className="font-mono text-right">{c.coefficient.toFixed(4)}</TableCell>
                                                {results.family !== 'gaussian' && (
                                                    <TableCell className="font-mono text-right">{c.exp_coefficient?.toFixed(4)}</TableCell>
                                                )}
                                                <TableCell className="font-mono text-right">
                                                    {c.p_value < 0.001 ? '<.001' : c.p_value.toFixed(4)} {getSignificanceStars(c.p_value)}
                                                </TableCell>
                                                <TableCell className="font-mono text-right">
                                                    [{c.conf_int_lower.toFixed(3)}, {c.conf_int_upper.toFixed(3)}]
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={isSignificant ? "default" : "secondary"}>
                                                        {isSignificant ? "Significant" : "Not Significant"}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                        <CardFooter>
                            <p className="text-sm text-muted-foreground">
                                Significance: *** p &lt; 0.001, ** p &lt; 0.01, * p &lt; 0.05
                                {family === 'binomial' && ' | Exp(Coef) = Odds Ratio'}
                            </p>
                        </CardFooter>
                    </Card>

                    {/* Full Model Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Full Model Details</CardTitle>
                            <CardDescription>Complete statistical output and diagnostics</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Model Information</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 text-sm">
                                        {mainSummaryData.map(item => (
                                            <div key={item.key} className="flex justify-between border-b py-1">
                                                <dt className="text-muted-foreground">{item.key}</dt>
                                                <dd className="font-mono">{item.value.replace(/Q\("([^"]+)"\)/g, '$1')}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </CardContent>
                            </Card>

                            {results.model_summary_data?.[1] && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Coefficients (Detailed)</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    {results.model_summary_data[1].data[0].map((header, i) => (
                                                        <TableHead key={i} className={i > 0 ? "text-right" : ""}>
                                                            {header}
                                                        </TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {results.model_summary_data[1].data.slice(1).map((row, i) => (
                                                    <TableRow key={i}>
                                                        {row.map((cell, j) => (
                                                            <TableCell key={j} className={`font-mono ${j > 0 ? "text-right" : ""}`}>
                                                                {cell.replace(/Q\("([^"]+)"\)/g, '$1')}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}


