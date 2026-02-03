'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { type DataSet } from '@/lib/stats';
import { type ExampleDataSet } from '@/lib/example-datasets';
import { exampleDatasets } from '@/lib/example-datasets';
import { Button } from '@/components/ui/button';
import { Users, BarChart, Settings, FileSearch, CheckCircle, XCircle, Lightbulb, AlertTriangle, HelpCircle, TrendingUp, Target, Activity, Layers, BookOpen, FlaskConical, Info, Scale, Sigma, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, FileText, BarChart3, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, Check, ArrowRight, ChevronDown, FileCode, FileType } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Label } from '../../ui/label';
import { Skeleton } from '../../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Badge } from '../../ui/badge';
import Papa from 'papaparse';

// ✅ FastAPI Cloud Run URL
const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 'https://statistica-api-dm6treznqq-du.a.run.app';


interface WelchsTTestResults {
    test_type: string;
    variable?: string;
    group_variable?: string;
    groups?: string[];
    n1?: number;
    n2?: number;
    mean1?: number;
    mean2?: number;
    std1?: number;
    std2?: number;
    var1?: number;
    var2?: number;
    variance_ratio?: number;
    mean_diff?: number;
    se_diff?: number;
    t_statistic: number;
    degrees_of_freedom: number;
    p_value: number;
    significant: boolean;
    ci_lower?: number;
    ci_upper?: number;
    cohens_d: number;
    hedges_g?: number;
    glass_delta?: number;
    interpretation: string;
    dropped_rows?: number[];
    n_dropped?: number;
    normality_test?: {
        [key: string]: {
            statistic: number;
            p_value: number;
            assumption_met: boolean;
        }
    };
    descriptives?: {
        [key: string]: {
            n: number;
            mean: number;
            std_dev: number;
            variance: number;
            se_mean?: number;
        }
    }
}

interface FullAnalysisResponse {
    results: WelchsTTestResults;
    plot: string;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
    { id: 1, label: 'Data', icon: Database },
    { id: 2, label: 'Settings', icon: Settings2 },
    { id: 3, label: 'Validation', icon: Shield },
    { id: 4, label: 'Summary', icon: FileText },
    { id: 5, label: 'Reasoning', icon: Lightbulb },
    { id: 6, label: 'Statistics', icon: BarChart3 },
];

// Generate interpretations for Welch's t-test (APA format)
const generateWelchsInterpretations = (results: WelchsTTestResults) => {
    const insights: string[] = [];
    
    const pValue = results.p_value;
    const tStat = results.t_statistic;
    const cohensD = results.cohens_d;
    const df = results.degrees_of_freedom;
    const isSignificant = pValue <= 0.05;
    const groups = results.groups || ['Group 1', 'Group 2'];
    const variable = results.variable || 'dependent variable';
    
    const desc1 = results.descriptives?.[groups[0]];
    const desc2 = results.descriptives?.[groups[1]];
    const mean1 = desc1?.mean || results.mean1 || 0;
    const mean2 = desc2?.mean || results.mean2 || 0;
    const sd1 = desc1?.std_dev || results.std1 || 0;
    const sd2 = desc2?.std_dev || results.std2 || 0;
    const n1 = desc1?.n || results.n1 || 0;
    const n2 = desc2?.n || results.n2 || 0;
    const meanDiff = results.mean_diff || (mean1 - mean2);
    const varianceRatio = results.variance_ratio || 1;
    
    const absD = Math.abs(cohensD);
    let effectLabel = 'negligible';
    if (absD >= 0.8) effectLabel = 'large';
    else if (absD >= 0.5) effectLabel = 'medium';
    else if (absD >= 0.2) effectLabel = 'small';
    
    const pFormatted = pValue < .001 ? '< .001' : `= ${pValue.toFixed(3).replace(/^0/, '')}`;
    
    const ci = results.ci_lower !== undefined && results.ci_upper !== undefined 
        ? `95% CI [${results.ci_lower.toFixed(2)}, ${results.ci_upper.toFixed(2)}]` 
        : '';
    
    let overall = `A Welch's <em>t</em>-test was conducted to compare <strong>${variable}</strong> between ${groups[0]} and ${groups[1]} groups. `;
    overall += `Welch's test was used because it does not assume equal variances between groups. `;
    overall += `The variance ratio was ${varianceRatio.toFixed(2)}, indicating ${varianceRatio > 2 ? 'substantial heterogeneity of variance' : 'relatively similar variances'}. `;
    
    if (isSignificant) {
        overall += `There was a significant difference in scores for ${groups[0]} (<em>M</em> = ${mean1.toFixed(2)}, <em>SD</em> = ${sd1.toFixed(2)}) and ${groups[1]} (<em>M</em> = ${mean2.toFixed(2)}, <em>SD</em> = ${sd2.toFixed(2)}); <em>t</em>(${df.toFixed(2)}) = ${tStat.toFixed(2)}, <em>p</em> ${pFormatted}, <em>d</em> = ${cohensD.toFixed(2)}. `;
        overall += `The effect size was ${effectLabel}. `;
        if (ci) {
            overall += `The ${ci} for the mean difference did not include zero. `;
        }
        overall += `${groups[0]} scored ${meanDiff > 0 ? 'higher' : 'lower'} than ${groups[1]} by ${Math.abs(meanDiff).toFixed(2)} units on average.`;
    } else {
        overall += `There was no significant difference in scores for ${groups[0]} (<em>M</em> = ${mean1.toFixed(2)}, <em>SD</em> = ${sd1.toFixed(2)}) and ${groups[1]} (<em>M</em> = ${mean2.toFixed(2)}, <em>SD</em> = ${sd2.toFixed(2)}); <em>t</em>(${df.toFixed(2)}) = ${tStat.toFixed(2)}, <em>p</em> ${pFormatted}, <em>d</em> = ${cohensD.toFixed(2)}. `;
        if (ci) {
            overall += `The ${ci} for the mean difference included zero. `;
        }
        overall += `The null hypothesis of no difference between groups cannot be rejected.`;
    }
    
    const pText = pValue < 0.001 ? '< .001' : pValue.toFixed(3);
    if (pValue < 0.001) {
        insights.push(`<strong>Significance:</strong> <em>p</em> < .001. Highly significant.`);
    } else if (pValue < 0.01) {
        insights.push(`<strong>Significance:</strong> <em>p</em> = ${pText}. Significant at .01 level.`);
    } else if (pValue < 0.05) {
        insights.push(`<strong>Significance:</strong> <em>p</em> = ${pText}. Significant at .05 level.`);
    } else if (pValue < 0.10) {
        insights.push(`<strong>Significance:</strong> <em>p</em> = ${pText}. Marginally significant.`);
    } else {
        insights.push(`<strong>Significance:</strong> <em>p</em> = ${pText}. Not statistically significant.`);
    }
    
    insights.push(`<strong>Test Statistic:</strong> <em>t</em>(${df.toFixed(2)}) = ${tStat.toFixed(2)}. Welch-Satterthwaite df account for unequal variances.`);
    
    insights.push(`<strong>Variance Ratio:</strong> ${varianceRatio.toFixed(2)}. ${varianceRatio > 4 ? 'Large difference justifies Welch\'s correction.' : varianceRatio > 2 ? 'Moderate difference.' : 'Similar variances.'}`);
    
    insights.push(`<strong>Effect Size:</strong> Cohen's <em>d</em> = ${cohensD.toFixed(2)} (${effectLabel}).`);
    
    if (results.hedges_g !== undefined) {
        insights.push(`<strong>Hedges' g:</strong> ${results.hedges_g.toFixed(3)} (bias-corrected).`);
    }
    
    insights.push(`<strong>Mean Difference:</strong> ${meanDiff.toFixed(2)} units. ${groups[0]} ${meanDiff > 0 ? 'outperformed' : 'scored lower than'} ${groups[1]}.`);
    
    if (results.ci_lower !== undefined && results.ci_upper !== undefined) {
        const includesZero = results.ci_lower <= 0 && 0 <= results.ci_upper;
        insights.push(`<strong>Confidence Interval:</strong> ${ci}. ${includesZero ? 'Includes zero.' : 'Excludes zero.'}`);
    }
    
    const totalN = n1 + n2;
    insights.push(`<strong>Sample Size:</strong> <em>n</em><sub>1</sub> = ${n1}, <em>n</em><sub>2</sub> = ${n2} (total <em>N</em> = ${totalN}).`);
    
    if (results.normality_test) {
        const normResults = Object.entries(results.normality_test);
        const allNormal = normResults.every(([_, test]) => test.assumption_met);
        if (allNormal) {
            insights.push(`<strong>Normality:</strong> Both groups are approximately normally distributed.`);
        } else {
            const violated = normResults.filter(([_, test]) => !test.assumption_met).map(([group, _]) => group);
            insights.push(`<strong>Normality:</strong> Non-normality in: ${violated.join(', ')}.`);
        }
    }
    
    let recommendations = '';
    if (!isSignificant) {
        recommendations = `
            <ul class="list-disc list-inside space-y-1 ml-2">
                <li>The null hypothesis cannot be rejected at α = .05</li>
                <li>Consider increasing sample size for greater power</li>
                <li>Evaluate practical significance of the observed difference</li>
            </ul>
        `;
    } else if (absD < 0.2) {
        recommendations = `
            <ul class="list-disc list-inside space-y-1 ml-2">
                <li>Despite significance, the effect size is negligible</li>
                <li>Consider practical importance of this difference</li>
            </ul>
        `;
    } else {
        recommendations = `
            <ul class="list-disc list-inside space-y-1 ml-2">
                <li>The result shows statistical and practical significance</li>
                <li>Consider replication to confirm the finding</li>
                ${varianceRatio > 2 ? '<li>Unequal variances may indicate different underlying processes</li>' : ''}
                ${absD >= 0.8 ? '<li>Large effect suggests meaningful real-world differences</li>' : ''}
            </ul>
        `;
    }
    
    return {
        overall_analysis: overall,
        statistical_insights: insights,
        recommendations: recommendations
    };
};

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: WelchsTTestResults }) => {
    const isSignificant = results.p_value <= 0.05;
    
    const getEffectSizeInterpretation = (cohensD: number) => {
        const absD = Math.abs(cohensD);
        if (absD < 0.2) return "Negligible";
        if (absD < 0.5) return "Small";
        if (absD < 0.8) return "Medium";
        return "Large";
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">T-Statistic</p>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.t_statistic.toFixed(3)}</p>
                        <p className="text-xs text-muted-foreground">Welch's t</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">P-value</p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${!isSignificant ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                            {results.p_value < 0.001 ? '<0.001' : results.p_value.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {isSignificant ? 'Significant' : 'Not Significant'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Cohen's d</p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.cohens_d.toFixed(3)}</p>
                        <p className="text-xs text-muted-foreground">
                            {getEffectSizeInterpretation(results.cohens_d)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Degrees of Freedom</p>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.degrees_of_freedom.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Welch-Satterthwaite df</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Intro Page
const WelchsIntroPage = ({ onLoadExample }: { onLoadExample: (e: any) => void }) => {
    const ttestExample = exampleDatasets.find(d => d.id === 't-test-suite');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Scale className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Welch's T-Test</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Compare means between two groups without assuming equal variances
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Scale className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Unequal Variances</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Does not assume equal variances between groups
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Shield className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">More Robust</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Better Type I error control when variances differ
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Adjusted df</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Uses Welch-Satterthwaite approximation
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FileSearch className="w-5 h-5" />
                            When to Use This Test
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use Welch's t-test when comparing means between two independent groups, especially when you cannot assume equal variances. Many statisticians recommend it as the default choice over Student's t-test because it provides valid results regardless of variance equality.
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
                                        <span><strong>One grouping variable:</strong> Exactly two groups</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>One numeric variable:</strong> Continuous outcome</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Independence:</strong> Groups are unrelated</span>
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
                                        <span><strong>t-statistic & p-value:</strong> Statistical significance</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Variance ratio:</strong> Heterogeneity measure</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Multiple effect sizes:</strong> Cohen's d, Hedges' g</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {ttestExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(ttestExample)} size="lg">
                                {ttestExample.icon && <ttestExample.icon className="mr-2 h-5 w-5" />}
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface WelchsTTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    restoredState?: any;
}

export default function WelchsTTestPage({ 
    data, 
    numericHeaders, 
    categoricalHeaders,
    onLoadExample,
    restoredState
}: WelchsTTestPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    // Wizard state
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    // Form state
    const [groupVar, setGroupVar] = useState<string>('');
    const [valueVar, setValueVar] = useState<string>('');
    const [alternative, setAlternative] = useState('two-sided');
    
    // Results state
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Filter to only binary categorical variables
    const binaryCatHeaders = useMemo(() => 
        categoricalHeaders.filter(h => new Set(data.map(row => row[h])).size === 2),
        [categoricalHeaders, data]
    );

    const canRun = useMemo(() => {
        return data.length > 0 && numericHeaders.length > 0 && binaryCatHeaders.length > 0;
    }, [data, numericHeaders, binaryCatHeaders]);

    // Data validation checks
    const dataValidation = useMemo(() => {
        const checks: { label: string; passed: boolean; detail: string }[] = [];
        
        if (groupVar && valueVar) {
            const groups = [...new Set(data.map(row => row[groupVar]))].filter(g => g != null && g !== '');
            const group1Data = data.filter(row => row[groupVar] === groups[0] && row[valueVar] != null && !isNaN(Number(row[valueVar])) && row[valueVar] !== '');
            const group2Data = data.filter(row => row[groupVar] === groups[1] && row[valueVar] != null && !isNaN(Number(row[valueVar])) && row[valueVar] !== '');
            
            const totalRows = data.length;
            const validRows = group1Data.length + group2Data.length;
            const missingCount = totalRows - validRows;
            
            checks.push({ 
                label: 'Sufficient sample size', 
                passed: group1Data.length >= 2 && group2Data.length >= 2, 
                detail: `Group 1: n = ${group1Data.length}, Group 2: n = ${group2Data.length} (minimum: 2 each)` 
            });
            checks.push({ 
                label: 'Two distinct groups', 
                passed: groups.length === 2, 
                detail: `Groups: ${groups.join(', ')}` 
            });
            checks.push({ 
                label: 'Missing values check', 
                passed: missingCount === 0, 
                detail: missingCount === 0 
                    ? 'No missing values detected' 
                    : `${missingCount} missing value${missingCount > 1 ? 's' : ''} will be excluded from analysis`
            });
            checks.push({ 
                label: 'Variables selected', 
                passed: groupVar !== '' && valueVar !== '', 
                detail: groupVar && valueVar ? `Comparing ${valueVar} between groups` : 'Please select both variables' 
            });
        }
        return checks;
    }, [data, groupVar, valueVar]);

    const allValidationsPassed = dataValidation.every(check => check.passed);

    useEffect(() => {
        if (binaryCatHeaders.length > 0 && !groupVar) {
            setGroupVar(binaryCatHeaders[0]);
        }
        if (numericHeaders.length > 0 && !valueVar) {
            setValueVar(numericHeaders[0]);
        }
    }, [binaryCatHeaders, numericHeaders, groupVar, valueVar]);

    useEffect(() => {
        if (restoredState) {
            setGroupVar(restoredState.params.groupVar || binaryCatHeaders[0] || '');
            setValueVar(restoredState.params.valueVar || numericHeaders[0] || '');
            setAlternative(restoredState.params.alternative || 'two-sided');
            setAnalysisResult({ results: restoredState.results, plot: '' });
            setView('main');
            setCurrentStep(4);
            setMaxReachedStep(6);
        } else {
            setView(canRun ? 'main' : 'intro');
            setAnalysisResult(null);
        }
    }, [restoredState, canRun, binaryCatHeaders, numericHeaders]);

    useEffect(() => {
        if (!restoredState) {
            setView(canRun ? 'main' : 'intro');
            setAnalysisResult(null);
            setCurrentStep(1);
            setMaxReachedStep(1);
        }
    }, [data, numericHeaders, categoricalHeaders, canRun]);

    const goToStep = (step: Step) => { 
        setCurrentStep(step); 
        if (step > maxReachedStep) setMaxReachedStep(step); 
    };

    const nextStep = () => { 
        if (currentStep === 3) {
            handleAnalysis();
        } else if (currentStep < 6) {
            goToStep((currentStep + 1) as Step); 
        }
    };

    const prevStep = () => { 
        if (currentStep > 1) goToStep((currentStep - 1) as Step); 
    };

    const getEffectSizeInterpretation = (d: number) => {
        const absD = Math.abs(d);
        if (absD >= 0.8) return { label: 'Large', color: 'text-foreground' };
        if (absD >= 0.5) return { label: 'Medium', color: 'text-foreground' };
        if (absD >= 0.2) return { label: 'Small', color: 'text-foreground' };
        return { label: 'Negligible', color: 'text-muted-foreground' };
    };

    const getPercentageChange = () => {
        if (!analysisResult?.results) return null;
        const results = analysisResult.results;
        if (results.descriptives) {
            const groups = Object.keys(results.descriptives);
            if (groups.length >= 2) {
                const mean1 = results.descriptives[groups[0]].mean;
                const mean2 = results.descriptives[groups[1]].mean;
                if (mean2 !== 0) return ((mean1 - mean2) / Math.abs(mean2) * 100).toFixed(1);
            }
        }
        return null;
    };

    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) {
            toast({ variant: 'destructive', title: 'No results to download' });
            return;
        }

        setIsDownloading(true);
        toast({ title: "Generating image..." });

        try {
            const canvas = await html2canvas(resultsRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
            });
            
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            const date = new Date().toISOString().split('T')[0];
            link.download = `Welchs_TTest_Report_${date}.png`;
            link.href = image;
            link.click();
            
            toast({ title: "Download complete" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Download failed" });
        } finally {
            setIsDownloading(false);
        }
    }, [toast]);

    const handleDownloadCSV = useCallback(() => {
        if (!analysisResult) return;
        
        const results = analysisResult.results;
        
        const mainResults = [{
            test_type: results.test_type,
            group_variable: results.group_variable || groupVar,
            dependent_variable: results.variable || valueVar,
            t_statistic: results.t_statistic,
            degrees_of_freedom: results.degrees_of_freedom,
            p_value: results.p_value,
            significant: results.significant,
            cohens_d: results.cohens_d,
            hedges_g: results.hedges_g,
            mean_diff: results.mean_diff,
            variance_ratio: results.variance_ratio,
        }];
        
        let csvContent = "WELCH'S T-TEST RESULTS\n";
        csvContent += Papa.unparse(mainResults) + "\n\n";
        
        if (results.descriptives) {
            csvContent += "DESCRIPTIVE STATISTICS\n";
            const descData = Object.entries(results.descriptives).map(([group, stats]: [string, any]) => ({
                group, n: stats.n, mean: stats.mean, std_dev: stats.std_dev, variance: stats.variance
            }));
            csvContent += Papa.unparse(descData) + "\n\n";
        }
        
        csvContent += "INTERPRETATION\n";
        csvContent += `"${results.interpretation}"\n`;
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `Welchs_TTest_Results_${date}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, groupVar, valueVar, toast]);
    


    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/welchs-ttest-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    groupVar,
                    valueVar,
                    alternative
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Welchs_TTest_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, groupVar, valueVar, alternative, toast]);
    
    const handleAnalysis = useCallback(async () => {
        if (!groupVar || !valueVar) {
            toast({ variant: 'destructive', title: 'Please select both grouping and dependent variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/welchs-ttest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    params: { 
                        variable: valueVar, 
                        group_variable: groupVar, 
                        alternative: alternative 
                    }
                })
            });

            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({}));
                throw new Error(errorResult.detail || errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);
            goToStep(4);
            toast({ title: "Welch's T-Test Complete", description: 'Results are ready.' });

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, groupVar, valueVar, alternative, toast]);

    if (!canRun || view === 'intro') {
        return <WelchsIntroPage onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;

    // Progress Bar Component
    const ProgressBar = () => (
        <div className="mb-8">
            <div className="flex items-center justify-between w-full gap-2">
                {STEPS.map((step) => {
                    const isCompleted = maxReachedStep > step.id || (step.id >= 4 && !!analysisResult);
                    const isCurrent = currentStep === step.id;
                    const isAccessible = step.id <= maxReachedStep || (step.id >= 4 && !!analysisResult);
                    return (
                        <button 
                            key={step.id}
                            onClick={() => isAccessible && goToStep(step.id)} 
                            disabled={!isAccessible}
                            className={`flex flex-col items-center gap-2 transition-all flex-1 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
                        >
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2
                                ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
                                {isCompleted && !isCurrent ? <Check className="w-5 h-5" /> : step.id}
                            </div>
                            <span className={`text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>{step.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div className="w-full max-w-5xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Welch's T-Test</h1>
                    <p className="text-muted-foreground mt-1">
                        Compare means between two groups without assuming equal variances.
                    </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                    <HelpCircle className="w-5 h-5"/>
                </Button>
            </div>

            <ProgressBar />

            <div className="min-h-[500px]">
                {/* Step 1: Data Selection */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Database className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Select Your Data</CardTitle>
                                    <CardDescription>Choose which variables to analyze</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Grouping Variable</Label>
                                    <Select value={groupVar} onValueChange={setGroupVar}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select grouping variable" /></SelectTrigger>
                                        <SelectContent>{binaryCatHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">Variable that defines your two groups</p>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Outcome Variable</Label>
                                    <Select value={valueVar} onValueChange={setValueVar}>
                                        <SelectTrigger className="h-11"><SelectValue placeholder="Select outcome variable" /></SelectTrigger>
                                        <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">The numeric variable to compare</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <p className="text-sm text-muted-foreground">Sample size: <span className="font-semibold text-foreground">{data.length}</span> observations</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4">
                            <Button onClick={nextStep} className="ml-auto" size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 2: Comparison Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Settings2 className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Comparison Settings</CardTitle>
                                    <CardDescription>Configure your hypothesis test</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Hypothesis Direction</Label>
                                <Select value={alternative} onValueChange={setAlternative}>
                                    <SelectTrigger className="h-11 max-w-md"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="two-sided">Two-Sided (≠) - Detect any difference</SelectItem>
                                        <SelectItem value="greater">One-Sided (&gt;) - Group 1 greater than Group 2</SelectItem>
                                        <SelectItem value="less">One-Sided (&lt;) - Group 1 less than Group 2</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Why Welch's T-Test?</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">No equal variance assumption:</strong> Works even when group spreads differ</p>
                                    <p>• <strong className="text-foreground">Recommended default:</strong> Many statisticians prefer Welch's over Student's t-test</p>
                                    <p>• <strong className="text-foreground">Robust:</strong> Provides valid results regardless of variance equality</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 3: Data Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Shield className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Data Validation</CardTitle>
                                    <CardDescription>Checking if your data is ready for analysis</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (
                                    <div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${check.passed ? 'bg-primary/5' : 'bg-rose-50/50 dark:bg-rose-950/20'}`}>
                                        {check.passed ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />}
                                        <div>
                                            <p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-rose-700 dark:text-rose-300'}`}>{check.label}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <Scale className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0" />
                                <p className="text-sm text-muted-foreground">Welch's test automatically adjusts for unequal variances between groups.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} disabled={!allValidationsPassed || isLoading} size="lg">
                                {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Run Analysis<ArrowRight className="ml-2 w-4 h-4" /></>}
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 4: Result Summary */}
                {currentStep === 4 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Result Summary</CardTitle>
                                    <CardDescription>Key findings from your analysis</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className={`rounded-xl p-6 space-y-4 border ${results.significant ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                <h3 className="font-semibold text-lg flex items-center gap-2"><Sparkles className={`w-5 h-5 ${results.significant ? 'text-primary' : 'text-rose-600'}`} />Key Findings</h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <span className={`font-bold ${results.significant ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                        <p className="text-sm">
                                            {(() => {
                                                const groups = results.groups || ['Group 1', 'Group 2'];
                                                const meanDiff = results.mean_diff || 0;
                                                const pctChange = getPercentageChange();
                                                if (pctChange) {
                                                    return `${groups[0]} is ${Math.abs(parseFloat(pctChange))}% ${meanDiff >= 0 ? 'higher' : 'lower'} than ${groups[1]}.`;
                                                }
                                                return `${groups[0]} is ${Math.abs(meanDiff).toFixed(2)} units ${meanDiff >= 0 ? 'higher' : 'lower'} than ${groups[1]}.`;
                                            })()}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className={`font-bold ${results.significant ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                        <p className="text-sm">
                                            {results.significant 
                                                ? "This difference is real and consistent — not just random variation in your data."
                                                : "This difference could simply be normal variation — we can't confirm it's a real trend."}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className={`font-bold ${results.significant ? 'text-primary' : 'text-rose-600'}`}>•</span>
                                        <p className="text-sm">
                                            {(() => {
                                                const absD = Math.abs(results.cohens_d);
                                                if (absD >= 0.8) return "The impact is substantial — this difference will likely affect your business outcomes.";
                                                if (absD >= 0.5) return "The impact is moderate — worth paying attention to and potentially acting on.";
                                                if (absD >= 0.2) return "The impact is minor — may or may not be worth addressing depending on your priorities.";
                                                return "The impact is minimal — unlikely to meaningfully affect your outcomes.";
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className={`rounded-xl p-5 border ${results.significant && Math.abs(results.cohens_d) >= 0.2 ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                <div className="flex items-start gap-3">
                                    {results.significant && Math.abs(results.cohens_d) >= 0.2 ? <CheckCircle2 className="w-6 h-6 text-primary" /> : <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400" />}
                                    <div>
                                        <p className="font-semibold">
                                            {results.significant && Math.abs(results.cohens_d) >= 0.2 
                                                ? "Action Recommended" 
                                                : results.significant 
                                                    ? "Monitor Closely" 
                                                    : "No Action Needed"}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {results.significant && Math.abs(results.cohens_d) >= 0.2 
                                                ? "There's a meaningful difference between the groups. Consider investigating the root cause." 
                                                : results.significant 
                                                    ? "There's a confirmed difference, but it's small. Keep monitoring." 
                                                    : "The groups perform similarly. No intervention needed based on this analysis."}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Mean Difference</p>
                                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{(results.mean_diff || 0).toFixed(3)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {getPercentageChange() ? `${parseFloat(getPercentageChange()!) >= 0 ? '+' : ''}${getPercentageChange()}%` : 'Group 1 - Group 2'}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">P-value</p>
                                                <Activity className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className={`text-2xl font-semibold ${!results.significant ? 'text-rose-600 dark:text-rose-400' : ''}`}>
                                                {results.p_value < 0.001 ? '<0.001' : results.p_value.toFixed(4)}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {results.significant ? 'Significant' : 'Not Significant'}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Cohen's d</p>
                                                <Target className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{results.cohens_d.toFixed(3)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {getEffectSizeInterpretation(results.cohens_d).label}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Variance Ratio</p>
                                                <Scale className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{(results.variance_ratio || 1).toFixed(2)}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {(results.variance_ratio || 1) > 2 ? 'Unequal' : 'Similar'}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="flex items-center justify-center gap-1 py-2">
                                <span className="text-sm text-muted-foreground mr-2">Confidence:</span>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <span key={star} className={`text-lg ${(results.p_value < 0.001 && star <= 5) || (results.p_value < 0.01 && star <= 4) || (results.p_value < 0.05 && star <= 3) || (results.p_value < 0.1 && star <= 2) || star <= 1 ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end">
                            <Button onClick={nextStep} size="lg">Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 5: Reasoning */}
                {currentStep === 5 && results && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Lightbulb className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Why This Conclusion?</CardTitle>
                                    <CardDescription>Simple explanation of how we reached this result</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">What We Measured</h4>
                                            <p className="text-sm text-muted-foreground">
                                                We compared <strong className="text-foreground">{valueVar}</strong> between the two groups in <strong className="text-foreground">{groupVar}</strong>, accounting for potentially different variability in each group.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">The Gap</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {(() => {
                                                    const groups = results.groups || ['Group 1', 'Group 2'];
                                                    const desc1 = results.descriptives?.[groups[0]];
                                                    const desc2 = results.descriptives?.[groups[1]];
                                                    if (desc1 && desc2) {
                                                        return <><strong className="text-foreground">{groups[0]}</strong> averaged <strong className="text-foreground">{desc1.mean.toFixed(2)}</strong> while <strong className="text-foreground">{groups[1]}</strong> averaged <strong className="text-foreground">{desc2.mean.toFixed(2)}</strong>. That's a difference of <strong className="text-foreground">{Math.abs(desc1.mean - desc2.mean).toFixed(2)}</strong> units.</>;
                                                    }
                                                    return `The mean difference was ${Math.abs(results.mean_diff || 0).toFixed(2)} units.`;
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Is It Real or Just Noise?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {results.significant
                                                    ? <>We're <strong className="text-foreground">confident this gap is real</strong>. Based on your data, there's less than 5% chance this is just random fluctuation.</>
                                                    : <>We <strong className="text-foreground">can't be sure this gap is real</strong>. It could easily be normal variation rather than a genuine difference between groups.</>}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-muted/30 rounded-xl p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                        <div>
                                            <h4 className="font-semibold mb-1">Does It Matter?</h4>
                                            <p className="text-sm text-muted-foreground">
                                                {(() => {
                                                    const absD = Math.abs(results.cohens_d);
                                                    if (absD >= 0.8) return <>Yes — this is a <strong className="text-foreground">large gap</strong> that's likely to have real business impact.</>;
                                                    if (absD >= 0.5) return <>Probably — this is a <strong className="text-foreground">moderate gap</strong>. Depending on your context, it could be worth addressing.</>;
                                                    if (absD >= 0.2) return <>Maybe — this is a <strong className="text-foreground">small gap</strong>. Consider whether it's worth the effort to address.</>;
                                                    return <>Not really — even if real, this gap is <strong className="text-foreground">too small</strong> to meaningfully impact your results.</>;
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={`rounded-xl p-5 border ${results.significant ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' : 'bg-gradient-to-br from-rose-50/50 to-red-50/50 dark:from-rose-950/10 dark:to-red-950/10 border-rose-300 dark:border-rose-700'}`}>
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    {results.significant && Math.abs(results.cohens_d) >= 0.5 
                                        ? <><CheckCircle2 className="w-5 h-5 text-primary" /> Bottom Line: Take Action</> 
                                        : results.significant 
                                            ? <><Info className="w-5 h-5 text-primary" /> Bottom Line: Keep Watching</> 
                                            : <><AlertTriangle className="w-5 h-5 text-rose-600" /> Bottom Line: Stay the Course</>}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    {results.significant && Math.abs(results.cohens_d) >= 0.5 
                                        ? "You have a confirmed, meaningful difference between groups. This warrants attention and likely action." 
                                        : results.significant 
                                            ? "There's a real but small gap. Monitor the trend, but don't overreact." 
                                            : "The groups perform similarly. No changes needed based on this analysis."}
                                </p>
                            </div>

                            <div className="bg-muted/20 rounded-xl p-4">
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4" />Impact Scale Reference</h4>
                                <div className="grid grid-cols-4 gap-2 text-xs">
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">Minimal</p><p className="text-muted-foreground">No action</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">Small</p><p className="text-muted-foreground">Optional</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">Moderate</p><p className="text-muted-foreground">Consider</p></div>
                                    <div className="text-center p-2 bg-background rounded-lg"><p className="font-medium">Large</p><p className="text-muted-foreground">Act now</p></div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} size="lg">View Full Statistics<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistical Details */}
                {currentStep === 6 && results && (
                    <>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-semibold">Statistical Details</h2>
                            <p className="text-sm text-muted-foreground">Full technical report</p>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Download className="mr-2 h-4 w-4" />
                                    Export
                                    <ChevronDown className="ml-2 h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDownloadCSV}>
                                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                                    CSV Spreadsheet
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                                    PNG Image
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDownloadDOCX}>
                                    <FileType className="mr-2 h-4 w-4" />
                                    Word Document
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                    <FileText className="mr-2 h-4 w-4" />
                                    PDF Report
                                    <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                    <FileType className="mr-2 h-4 w-4" />
                                    Word Document
                                    <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                    <BarChart3 className="mr-2 h-4 w-4" />
                                    PowerPoint
                                    <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled className="text-muted-foreground">
                                    <FileCode className="mr-2 h-4 w-4" />
                                    Python Script
                                    <Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                        <div className="text-center py-4 border-b">
                            <h2 className="text-2xl font-bold">Welch's T-Test Report</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                Group: {groupVar} | Dependent: {valueVar} | {new Date().toLocaleDateString()}
                            </p>
                        </div>

                        <StatisticalSummaryCards results={results} />

                        {results.n_dropped !== undefined && results.n_dropped > 0 && (
                            <Card>
                                <CardContent className="pt-6">
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Missing Values</AlertTitle>
                                        <AlertDescription>
                                            {results.n_dropped} rows excluded due to missing values.
                                        </AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>
                        )}

                        {(() => {
                            const interpretations = generateWelchsInterpretations(results);
                            return (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Detailed Analysis</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                            <div className="flex items-center gap-2 mb-4">
                                                <BookOpen className="h-4 w-4 text-primary" />
                                                <h3 className="font-semibold">APA Format Summary</h3>
                                                </div>
                                            <div 
                                                className="text-sm leading-relaxed prose prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{ __html: interpretations.overall_analysis }}
                                            />
                                        </div>                                       
                                    </CardContent>
                                </Card>
                            );
                        })()}
                        
                        <Card>
                            <CardHeader>
                                <CardTitle>Visualization</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Image 
                                    src={analysisResult.plot} 
                                    alt="Welch's T-Test Visualization" 
                                    width={1500} 
                                    height={1200} 
                                    className="w-3/4 mx-auto rounded-sm border"
                                />
                            </CardContent>
                        </Card>

                        {results.descriptives && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Descriptive Statistics</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Group</TableHead>
                                                <TableHead className="text-right">N</TableHead>
                                                <TableHead className="text-right">Mean</TableHead>
                                                <TableHead className="text-right">SD</TableHead>
                                                <TableHead className="text-right">Variance</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(results.descriptives).map(([group, stats]) => (
                                                <TableRow key={group}>
                                                    <TableCell className="font-medium">{group}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.std_dev.toFixed(3)}</TableCell>
                                                    <TableCell className="text-right font-mono">{stats.variance.toFixed(3)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    {results.variance_ratio && (
                                        <div className="mt-4 flex items-center gap-2 p-3 bg-muted rounded-md">
                                            <Scale className="h-4 w-4 text-muted-foreground" />
                                            <p className="text-sm text-muted-foreground">
                                                <strong>Variance Ratio:</strong> {results.variance_ratio.toFixed(2)} 
                                                {results.variance_ratio > 4 
                                                    ? ' (Large difference - Welch\'s correction is important)'
                                                    : results.variance_ratio > 2
                                                        ? ' (Moderate difference)'
                                                        : ' (Similar variances)'
                                                }
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader>
                                <CardTitle>Welch's T-Test Results</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Statistic</TableHead>
                                            <TableHead className="text-right">Value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Mean Difference</TableCell>
                                            <TableCell className="font-mono text-right">{results.se_diff != null ? Number(results.se_diff).toFixed(4) : '-'}</TableCell>                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">SE of Difference</TableCell>
                                            <TableCell className="font-mono text-right">{results.se_diff?.toFixed(4)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">t-statistic</TableCell>
                                            <TableCell className="font-mono text-right">{results.t_statistic.toFixed(4)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">Degrees of Freedom</TableCell>
                                            <TableCell className="font-mono text-right">{results.degrees_of_freedom.toFixed(2)}</TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="font-medium">p-value</TableCell>
                                            <TableCell className="font-mono text-right">
                                                {results.p_value < 0.001 ? '<.001' : results.p_value.toFixed(4)}
                                            </TableCell>
                                        </TableRow>
                                        {results.ci_lower !== undefined && results.ci_upper !== undefined && (
                                            <TableRow>
                                                <TableCell className="font-medium">95% CI</TableCell>
                                                <TableCell className="font-mono text-right">
                                                    [{results.ci_lower.toFixed(3)}, {results.ci_upper.toFixed(3)}]
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Effect Sizes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Measure</TableHead>
                                            <TableHead className="text-right">Value</TableHead>
                                            <TableHead>Interpretation</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="font-medium">Cohen's d</TableCell>
                                            <TableCell className="font-mono text-right">{results.cohens_d.toFixed(3)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{getEffectSizeInterpretation(results.cohens_d).label}</Badge>
                                            </TableCell>
                                        </TableRow>
                                        {results.hedges_g !== undefined && (
                                            <TableRow>
                                                <TableCell className="font-medium">Hedges' g</TableCell>
                                                <TableCell className="font-mono text-right">{results.hedges_g.toFixed(3)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{getEffectSizeInterpretation(results.hedges_g).label}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                        {results.glass_delta !== undefined && (
                                            <TableRow>
                                                <TableCell className="font-medium">Glass's Δ</TableCell>
                                                <TableCell className="font-mono text-right">{results.glass_delta.toFixed(3)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{getEffectSizeInterpretation(results.glass_delta).label}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {results.normality_test && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Assumption Checks</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <h4 className="text-sm font-semibold mb-2">Normality (Shapiro-Wilk)</h4>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Group</TableHead>
                                                <TableHead className="text-right">W</TableHead>
                                                <TableHead className="text-right">p</TableHead>
                                                <TableHead className="text-right">Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.entries(results.normality_test).map(([group, test]: [string, any]) => (
                                                <TableRow key={group}>
                                                    <TableCell className="font-medium">{group}</TableCell>
                                                    <TableCell className="font-mono text-right">{test.statistic.toFixed(4)}</TableCell>
                                                    <TableCell className="font-mono text-right">
                                                        {test.p_value < 0.001 ? '<.001' : test.p_value.toFixed(4)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {test.assumption_met ? (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700">
                                                                <CheckCircle className="h-3 w-3 mr-1" />Met
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-red-50 text-red-700">
                                                                <XCircle className="h-3 w-3 mr-1" />Violated
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <p className="text-xs text-muted-foreground mt-2">p &gt; .05 indicates normality. Welch's test is robust to mild violations.</p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    
                    <div className="mt-4 flex justify-start">
                        <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                    </div>
                    </>
                )}
            </div>
        </div>
    );
}
