'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, GitCommit, HelpCircle, Settings, FileSearch, CheckCircle, AlertTriangle, TrendingUp, Activity, Info, BarChart3, Download, Bot, BookOpen } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import Papa from 'papaparse';

interface DidResults {
    model_summary_data: {
        caption: string | null;
        data: string[][];
    }[];
    params: { [key: string]: number };
    pvalues: { [key: string]: number };
    rsquared: number;
    rsquared_adj: number;
    interpretation: string;
}

interface FullAnalysisResponse {
    results: DidResults;
    plot: string;
    interpretations?: {
        overall_analysis: string;
        model_insights: string[];
        recommendations: string;
    };
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: DidResults }) => {
    // Find DiD effect
    const didEffectEntry = Object.entries(results.params).find(([key]) => key.includes('DiD_Effect') || key.includes(':'));
    const didEffect = didEffectEntry ? didEffectEntry[1] : 0;
    const didPValue = didEffectEntry ? results.pvalues[didEffectEntry[0]] : 1;
    
    // Find group and time main effects
    const groupEntry = Object.entries(results.params).find(([key]) => key.toLowerCase().includes('group') && !key.includes(':'));
    const timeEntry = Object.entries(results.params).find(([key]) => key.toLowerCase().includes('time') && !key.includes(':'));
    
    const groupEffect = groupEntry ? groupEntry[1] : 0;
    const timeEffect = timeEntry ? timeEntry[1] : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* DiD Effect Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                DiD Effect
                            </p>
                            <GitCommit className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {didEffect.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Treatment impact
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* P-value Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Significance
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {didPValue < 0.001 ? '<0.001' : didPValue.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {didPValue < 0.05 ? 'Statistically significant' : 'Not significant'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* R-squared Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                R-squared
                            </p>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {results.rsquared.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Model fit
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Adjusted R-squared Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Adj. R-squared
                            </p>
                            <Info className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {results.rsquared_adj.toFixed(4)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Adjusted fit
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const DIDOverview = ({ groupVar, timeVar, outcomeVar, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (!outcomeVar) {
            overview.push('⚠ Select outcome variable');
        } else {
            overview.push(`Outcome variable: ${outcomeVar}`);
        }
        
        if (!groupVar) {
            overview.push('⚠ Select group variable (treatment/control)');
        } else {
            overview.push(`Group variable: ${groupVar}`);
        }
        
        if (!timeVar) {
            overview.push('⚠ Select time variable (pre/post)');
        } else {
            overview.push(`Time variable: ${timeVar}`);
        }

        // Data characteristics
        overview.push(`${data.length} observations available`);

        // Method information
        overview.push('Method: Difference-in-Differences (DiD)');
        overview.push('Compares treatment vs control over time');
        overview.push('Assumes parallel trends assumption');
        overview.push('Interaction term estimates causal effect');
        overview.push('Best for: Policy/intervention evaluation');

        return overview;
    }, [outcomeVar, groupVar, timeVar, data]);

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

// Generate interpretations based on DiD results
const generateDIDInterpretations = (results: DidResults, groupVar: string, timeVar: string, outcomeVar: string) => {
    const insights: string[] = [];
    
    // Find DiD effect
    const didEffectEntry = Object.entries(results.params).find(([key]) => key.includes('DiD_Effect') || key.includes(':'));
    const didEffect = didEffectEntry ? didEffectEntry[1] : 0;
    const didPValue = didEffectEntry ? results.pvalues[didEffectEntry[0]] : 1;
    const isSignificant = didPValue < 0.05;
    
    // Overall analysis
    let overall = '';
    if (isSignificant) {
        if (Math.abs(didEffect) < 0.1) {
            overall = `<strong>Small but significant treatment effect detected.</strong> The DiD estimate (${didEffect.toFixed(4)}) is statistically significant (p ${didPValue < 0.001 ? '<0.001' : '= ' + didPValue.toFixed(3)}), indicating that the intervention had a ${didEffect > 0 ? 'positive' : 'negative'} causal effect on ${outcomeVar}, though the magnitude is relatively small.`;
        } else if (Math.abs(didEffect) < 1) {
            overall = `<strong>Moderate treatment effect detected.</strong> The DiD estimate (${didEffect.toFixed(4)}) is statistically significant (p ${didPValue < 0.001 ? '<0.001' : '= ' + didPValue.toFixed(3)}), suggesting that the intervention had a meaningful ${didEffect > 0 ? 'positive' : 'negative'} causal impact on ${outcomeVar}.`;
        } else {
            overall = `<strong>Substantial treatment effect detected.</strong> The DiD estimate (${didEffect.toFixed(4)}) is highly significant (p ${didPValue < 0.001 ? '<0.001' : '= ' + didPValue.toFixed(3)}), indicating a strong ${didEffect > 0 ? 'positive' : 'negative'} causal effect of the intervention on ${outcomeVar}. This suggests the treatment had a major impact.`;
        }
    } else {
        overall = `<strong>No significant treatment effect detected.</strong> The DiD estimate (${didEffect.toFixed(4)}) is not statistically significant (p = ${didPValue.toFixed(3)}). This suggests that the intervention did not have a measurable causal effect on ${outcomeVar}, or that the effect is too small to detect with the current sample size.`;
    }
    
    // DiD coefficient insight
    insights.push(`<strong>DiD Coefficient:</strong> ${didEffect.toFixed(4)} (p ${didPValue < 0.001 ? '<0.001' : '= ' + didPValue.toFixed(3)}). This represents the estimated causal effect of the treatment. ${isSignificant ? 'The effect is statistically significant at the 5% level.' : 'The effect is not statistically significant.'}`);
    
    // Direction interpretation
    if (isSignificant) {
        if (didEffect > 0) {
            insights.push(`<strong>Effect Direction:</strong> The positive DiD coefficient indicates that the treatment group experienced a greater increase (or smaller decrease) in ${outcomeVar} compared to the control group after the intervention.`);
        } else {
            insights.push(`<strong>Effect Direction:</strong> The negative DiD coefficient indicates that the treatment group experienced a smaller increase (or greater decrease) in ${outcomeVar} compared to the control group after the intervention.`);
        }
    }
    
    // Model fit insight
    const rSquaredPct = (results.rsquared * 100).toFixed(1);
    if (results.rsquared > 0.7) {
        insights.push(`<strong>Model Fit:</strong> R² = ${results.rsquared.toFixed(4)} (${rSquaredPct}%). The model explains a substantial portion of the variation in ${outcomeVar}, suggesting good fit.`);
    } else if (results.rsquared > 0.3) {
        insights.push(`<strong>Model Fit:</strong> R² = ${results.rsquared.toFixed(4)} (${rSquaredPct}%). The model explains a moderate portion of the variation in ${outcomeVar}.`);
    } else {
        insights.push(`<strong>Model Fit:</strong> R² = ${results.rsquared.toFixed(4)} (${rSquaredPct}%). The model explains a limited portion of the variation in ${outcomeVar}. This is common in DiD analyses as other factors may influence the outcome.`);
    }
    
    // Parallel trends assumption
    insights.push(`<strong>Key Assumption:</strong> The DiD estimator assumes parallel trends - that the treatment and control groups would have followed similar trends in the absence of the intervention. This assumption cannot be directly tested but should be examined using pre-treatment data visualization.`);
    
    // Main effects insight
    const groupEntry = Object.entries(results.params).find(([key]) => key.toLowerCase().includes('group') && !key.includes(':'));
    const timeEntry = Object.entries(results.params).find(([key]) => key.toLowerCase().includes('time') && !key.includes(':'));
    
    if (groupEntry && timeEntry) {
        insights.push(`<strong>Main Effects:</strong> Group coefficient = ${groupEntry[1].toFixed(4)}, Time coefficient = ${timeEntry[1].toFixed(4)}. These represent baseline differences between groups and overall time trends, respectively.`);
    }
    
    let recommendations = '';
    if (isSignificant) {
        recommendations = `<p class="mb-3">Your DiD analysis has identified a statistically significant treatment effect. To strengthen your findings:</p>
    <ul class="space-y-2 ml-4">
        <li class="flex items-start gap-2">
            <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
            <span>Verify the parallel trends assumption by plotting pre-treatment trends for both groups</span>
        </li>
        <li class="flex items-start gap-2">
            <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
            <span>Consider robustness checks with different time periods or control groups</span>
        </li>
        <li class="flex items-start gap-2">
            <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
            <span>Examine whether there are any confounding events that occurred simultaneously with the intervention</span>
        </li>
        <li class="flex items-start gap-2">
            <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
            <span>If possible, conduct placebo tests using pre-treatment periods to test for spurious effects</span>
        </li>
        <li class="flex items-start gap-2">
            <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
            <span>Consider heterogeneous treatment effects across different subgroups</span>
        </li>
    </ul>`;
    } else {
        recommendations = `<p class="mb-3">No significant treatment effect was detected. This could indicate:</p>
    <ul class="space-y-2 ml-4 mb-4">
        <li class="flex items-start gap-2">
            <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
            <span>The intervention truly had no effect</span>
        </li>
        <li class="flex items-start gap-2">
            <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
            <span>The effect was too small to detect with your sample size - consider power analysis</span>
        </li>
        <li class="flex items-start gap-2">
            <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
            <span>The parallel trends assumption may be violated</span>
        </li>
        <li class="flex items-start gap-2">
            <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
            <span>There may be spillover effects or contamination between groups</span>
        </li>
        <li class="flex items-start gap-2">
            <span class="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
            <span>The intervention may have heterogeneous effects that average out to zero</span>
        </li>
    </ul>
    <p>Consider: examining the interaction plot for visual evidence of effects, checking for violations of parallel trends, or using alternative identification strategies if appropriate.</p>`;
    }
    
return {
    overall_analysis: overall,
    model_insights: insights,
    recommendations: recommendations
};
};  


// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <GitCommit className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Difference-in-Differences</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Estimate causal effects of interventions using observational data
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <GitCommit className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Treatment Groups</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Compare treated vs control
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Time Periods</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Before and after intervention
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Causal Effect</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Isolates treatment impact
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use DiD Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use DiD when you want to evaluate the causal effect of a policy, program, or intervention 
                            using observational data. DiD compares the change in outcomes over time between a treatment 
                            group (affected by the intervention) and a control group (not affected). The key assumption 
                            is parallel trends: in the absence of treatment, both groups would have followed similar 
                            trends. The DiD estimator is the interaction coefficient between group and time variables.
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
                                        <span><strong>Outcome (Y):</strong> Continuous variable to measure</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Group:</strong> Binary (treatment=1, control=0)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Time:</strong> Binary (post=1, pre=0)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Min Observations:</strong> 50+ recommended</span>
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
                                        <span><strong>Interaction:</strong> DiD effect (causal estimate)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Significance:</strong> P-value tests effect</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Plot:</strong> Visual parallel trends check</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>R²:</strong> Overall model fit</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-2">
                        <Button 
                            onClick={() => {
                                const example = exampleDatasets.find(d => d.id === 'did-data') || exampleDatasets[0];
                                onLoadExample(example);
                            }} 
                            size="lg"
                        >
                            <GitCommit className="mr-2 h-5 w-5" />
                            Load Example Dataset
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

interface DidPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function DidPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample, onGenerateReport }: DidPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [groupVar, setGroupVar] = useState<string | undefined>();
    const [timeVar, setTimeVar] = useState<string | undefined>();
    const [outcomeVar, setOutcomeVar] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const binaryCategoricalHeaders = useMemo(() => {
        return allHeaders.filter(h => new Set(data.map(row => row[h]).filter(v => v != null && v !== '')).size === 2);
    }, [data, allHeaders]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1 && binaryCategoricalHeaders.length >= 2, [data, numericHeaders, binaryCategoricalHeaders]);
    
    useEffect(() => {
        if (canRun) {
            setGroupVar(binaryCategoricalHeaders.find(h => h.toLowerCase().includes('group')) || binaryCategoricalHeaders[0]);
            setTimeVar(binaryCategoricalHeaders.find(h => h.toLowerCase().includes('time')) || binaryCategoricalHeaders[1]);
            setOutcomeVar(numericHeaders[0]);
            setView('main');
        } else {
            setView('intro');
        }
        setAnalysisResult(null);
    }, [canRun, numericHeaders, binaryCategoricalHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!groupVar || !timeVar || !outcomeVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select group, time, and outcome variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/did', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    group_var: groupVar, 
                    time_var: timeVar, 
                    outcome_var: outcomeVar 
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            // Generate interpretations
            const interpretations = generateDIDInterpretations(result.results, groupVar, timeVar, outcomeVar);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('DiD Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, groupVar, timeVar, outcomeVar, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) {
            toast({ title: "No Data to Download", description: "Analysis results are not available." });
            return;
        }
        
        const resultsData = Object.entries(analysisResult.results.params).map(([variable, coefficient]) => ({
            variable,
            coefficient,
            p_value: analysisResult.results.pvalues[variable]
        }));
        
        const csv = Papa.unparse(resultsData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'did_results.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "DiD results are being downloaded." });
    }, [analysisResult, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;
    const didEffectEntry = results ? Object.entries(results.params).find(([key]) => key.includes('DiD_Effect') || key.includes(':')) : undefined;
    const didPValue = didEffectEntry && results ? results.pvalues[didEffectEntry[0]] : undefined;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">DiD Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select outcome, group, and time variables for the difference-in-differences analysis.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Outcome Variable</Label>
                            <Select value={outcomeVar} onValueChange={setOutcomeVar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Group Variable (0/1)</Label>
                            <Select value={groupVar} onValueChange={setGroupVar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {binaryCategoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Time Variable (0/1)</Label>
                            <Select value={timeVar} onValueChange={setTimeVar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {binaryCategoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {/* Analysis Overview */}
                    <DIDOverview 
                        outcomeVar={outcomeVar}
                        groupVar={groupVar}
                        timeVar={timeVar}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        {analysisResult && (
                            <>
                                {onGenerateReport && (
                                    <Button variant="ghost" onClick={() => onGenerateReport(analysisResult, null)}>
                                        <Bot className="mr-2"/>AI Report
                                    </Button>
                                )}
                                <Button variant="outline" onClick={handleDownloadResults}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export Results
                                </Button>
                            </>
                        )}
                    </div>
                    <Button onClick={handleAnalysis} disabled={isLoading || !groupVar || !timeVar || !outcomeVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Running DiD analysis...</p>
                        <Skeleton className="h-[400px] w-full" />
                    </CardContent>
                </Card>
            )}

            {results && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Analysis Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Summary</CardTitle>
                            <CardDescription>Treatment effect estimation using difference-in-differences</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                {didPValue !== undefined && didPValue < 0.05 ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                                <AlertDescription>
                                    DiD analysis completed. {didPValue !== undefined && didPValue < 0.05 ? 'A statistically significant treatment effect was detected.' : 'No statistically significant treatment effect was detected.'}
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Detailed Analysis */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" />
                                Detailed Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Overall Analysis */}
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <GitCommit className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Treatment Effect Assessment</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.overall_analysis || '' }}
                                />
                            </div>

                            {/* Model Insights */}
                            {analysisResult.interpretations?.model_insights && analysisResult.interpretations.model_insights.length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-500/10 rounded-md">
                                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Key Findings</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {analysisResult.interpretations.model_insights.map((insight, idx) => (
                                            <li 
                                                key={idx}
                                                className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed"
                                            >
                                                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">•</span>
                                                <div dangerouslySetInnerHTML={{ __html: insight }} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Recommendations */}
                            <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-lg p-6 border border-amber-300 dark:border-amber-700">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-amber-500/10 rounded-md">
                                        <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <h3 className="font-semibold text-base">Recommendations</h3>
                                </div>
                                <div 
    className="text-sm text-foreground/80 leading-relaxed"
    dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.recommendations || '' }}
/>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Visualization */}
                    {analysisResult.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    Interaction Plot
                                </CardTitle>
                                <CardDescription>
                                    Visual representation of treatment and control group trends over time
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <img 
                                    src={analysisResult.plot}
                                    alt="DiD Interaction Plot"
                                    className="w-2/4 mx-auto rounded-sm border"
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Regression Results Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Regression Results</CardTitle>
                            <CardDescription>
                                Full model coefficients and statistical significance
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Variable</TableHead>
                                        <TableHead className="text-right">Coefficient</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                        <TableHead className="text-center">Sig.</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(results.params).map(([variable, coefficient]) => {
                                        const pValue = results.pvalues[variable];
                                        const isSignificant = pValue < 0.05;
                                        const isDiD = variable.includes('DiD_Effect') || variable.includes(':');
                                        return (
                                            <TableRow key={variable} className={isDiD ? 'bg-primary/5 font-semibold' : ''}>
                                                <TableCell className="font-semibold">{variable}</TableCell>
                                                <TableCell className="font-mono text-right">{coefficient.toFixed(4)}</TableCell>
                                                <TableCell className={`font-mono text-right ${isSignificant ? 'text-green-600' : ''}`}>
                                                    {pValue < 0.001 ? '<0.001' : pValue.toFixed(3)}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={isSignificant ? 'default' : 'outline'}>
                                                        {isSignificant ? '***' : 'ns'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                            
                            {results.model_summary_data && results.model_summary_data.length > 0 && (
                                <div className="space-y-4 mt-6">
                                    {results.model_summary_data.map((table, tableIndex) => (
                                        <div key={tableIndex}>
                                            {table.caption && (
                                                <p className="text-sm text-muted-foreground mb-2">{table.caption}</p>
                                            )}
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        {table.data[0].map((cell, cellIndex) => (
                                                            <TableHead key={cellIndex}>{cell}</TableHead>
                                                        ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {table.data.slice(1).map((row, rowIndex) => (
                                                        <TableRow key={rowIndex}>
                                                            {row.map((cell, cellIndex) => (
                                                                <TableCell key={cellIndex} className="font-mono">
                                                                    {cell}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <GitCommit className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Configure variables and click &apos;Run Analysis&apos; to estimate treatment effects.</p>
                </div>
            )}
        </div>
    );
}
