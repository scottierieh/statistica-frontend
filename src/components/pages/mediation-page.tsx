'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, CheckCircle2, AlertTriangle, HelpCircle, Settings, FileSearch, Bot, Download, Activity, Info, TrendingUp, GitBranch, Lightbulb, BookOpen } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from '@/components/ui/table';
import { Badge } from '../ui/badge';
import { CheckCircle } from 'lucide-react';
import Papa from 'papaparse';

interface MediationResult {
    baron_kenny: {
        path_a: any;
        path_b: any;
        path_c: any;
        path_c_prime: any;
        indirect_effect: number;
        sobel_test: any;
    };
    bootstrap?: {
        mean_effect: number;
        se: number;
        ci_lower: number;
        ci_upper: number;
        n_bootstrap: number;
        significant: boolean;
    };
    mediation_type: string;
    interpretation: string;
}

interface AnalysisResponse {
    results: MediationResult;
    plot: string;
    interpretations?: {
        overall_analysis: string;
        path_insights: string[];
        recommendations: string;
    };
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: MediationResult }) => {
    const bk = results.baron_kenny;
    const boot = results.bootstrap;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Mediation Type Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Mediation Type
                            </p>
                            {results.mediation_type === "Full Mediation" ? 
                                <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                                results.mediation_type === "Partial Mediation" ?
                                <AlertTriangle className="h-4 w-4 text-yellow-600" /> :
                                <Info className="h-4 w-4 text-gray-600" />
                            }
                        </div>
                        <p className="text-xl font-semibold">
                            {results.mediation_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.mediation_type === "Full Mediation" ? 'Complete indirect effect' :
                             results.mediation_type === "Partial Mediation" ? 'Both direct & indirect' :
                             'No significant mediation'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Indirect Effect Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Indirect Effect
                            </p>
                            <GitBranch className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {bk.indirect_effect.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            a × b pathway
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Bootstrap CI Card */}
            {boot && (
                <Card>
                    <CardContent className="p-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-muted-foreground">
                                    95% CI
                                </p>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className={`text-lg font-semibold font-mono ${boot.significant ? 'text-green-600' : 'text-gray-600'}`}>
                                [{boot.ci_lower.toFixed(3)}, {boot.ci_upper.toFixed(3)}]
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {boot.significant ? 'Does not include 0' : 'Includes 0'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Direct Effect Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Direct Effect
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {bk.path_c_prime.coef.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            c' pathway (p = {bk.path_c_prime.p_value < 0.001 ? '<.001' : bk.path_c_prime.p_value.toFixed(3)})
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const MediationOverview = ({ xVar, mVar, yVar, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (!xVar || !mVar || !yVar) {
            overview.push('Select independent (X), mediator (M), and dependent (Y) variables');
        } else {
            overview.push(`Independent variable (X): ${xVar}`);
            overview.push(`Mediator (M): ${mVar}`);
            overview.push(`Dependent variable (Y): ${yVar}`);
        }

        // Data characteristics
        if (data.length < 30) {
            overview.push(`⚠ Limited data (${data.length} points) - results may be less reliable`);
        } else {
            overview.push(`${data.length} data points available`);
        }

        // Analysis information
        overview.push('Method: Baron & Kenny + Bootstrap analysis');
        overview.push('Bootstrap samples: 1,000 iterations');
        overview.push('Variables are standardized before analysis');
        overview.push('Confidence level: 95%');
        overview.push('Best for: Testing causal mechanisms, process models');

        return overview;
    }, [xVar, mVar, yVar, data]);

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

// Generate interpretations based on mediation results
const generateMediationInterpretations = (results: MediationResult) => {
    const insights: string[] = [];
    const bk = results.baron_kenny;
    const boot = results.bootstrap;
    
    let overall = '';
    if (results.mediation_type === "Full Mediation") {
        overall = '<strong>Full mediation detected.</strong> The relationship between the independent variable and dependent variable is completely explained by the mediator. The direct path becomes non-significant when the mediator is included, indicating that the effect operates entirely through the mediator.';
    } else if (results.mediation_type === "Partial Mediation") {
        overall = '<strong>Partial mediation detected.</strong> The mediator explains part of the relationship between the independent and dependent variables, but a significant direct effect remains. Both direct and indirect pathways contribute to the overall effect.';
    } else {
        overall = '<strong>No significant mediation detected.</strong> The indirect effect through the mediator is not statistically significant. The relationship between the independent and dependent variables does not operate through the proposed mediator.';
    }
    
    // Path a insight
    insights.push(`<strong>Path a (X → M):</strong> β = ${bk.path_a.coef.toFixed(3)}, p ${bk.path_a.p_value < 0.001 ? '< .001' : `= ${bk.path_a.p_value.toFixed(3)}`}. The independent variable ${bk.path_a.p_value < 0.05 ? 'significantly predicts' : 'does not significantly predict'} the mediator.`);
    
    // Path b insight
    insights.push(`<strong>Path b (M → Y):</strong> β = ${bk.path_b.coef.toFixed(3)}, p ${bk.path_b.p_value < 0.001 ? '< .001' : `= ${bk.path_b.p_value.toFixed(3)}`}. The mediator ${bk.path_b.p_value < 0.05 ? 'significantly predicts' : 'does not significantly predict'} the dependent variable when controlling for X.`);
    
    // Path c' insight
    insights.push(`<strong>Path c' (X → Y direct):</strong> β = ${bk.path_c_prime.coef.toFixed(3)}, p ${bk.path_c_prime.p_value < 0.001 ? '< .001' : `= ${bk.path_c_prime.p_value.toFixed(3)}`}. The direct effect is ${bk.path_c_prime.p_value < 0.05 ? 'significant' : 'not significant'} after accounting for the mediator.`);
    
    // Path c insight
    insights.push(`<strong>Path c (Total effect):</strong> β = ${bk.path_c.coef.toFixed(3)}, p ${bk.path_c.p_value < 0.001 ? '< .001' : `= ${bk.path_c.p_value.toFixed(3)}`}. The total effect of X on Y is ${bk.path_c.p_value < 0.05 ? 'significant' : 'not significant'}.`);
    
    // Bootstrap insight
    if (boot) {
        insights.push(`<strong>Bootstrap Analysis:</strong> Based on ${boot.n_bootstrap.toLocaleString()} bootstrap samples, the indirect effect is ${boot.mean_effect.toFixed(3)} with 95% CI [${boot.ci_lower.toFixed(3)}, ${boot.ci_upper.toFixed(3)}]. The confidence interval ${boot.significant ? 'does not include zero, confirming' : 'includes zero, suggesting no'} significant mediation.`);
    }
    
    // Recommendations
    let recommendations = '';
    if (results.mediation_type === "Full Mediation") {
        recommendations = 'The full mediation model suggests that interventions should target the mediator to influence the outcome. Consider: (1) Investigating why the direct path is non-significant, (2) Testing alternative models with multiple mediators, (3) Examining boundary conditions or moderators, (4) Replicating findings with independent samples. Report both the indirect effect and the non-significant direct effect in publications.';
    } else if (results.mediation_type === "Partial Mediation") {
        recommendations = 'Partial mediation indicates multiple pathways of influence. Consider: (1) Identifying additional mediators that might explain the remaining direct effect, (2) Testing for moderated mediation (conditional indirect effects), (3) Examining if the direct effect represents an independent causal pathway or unmeasured mediators, (4) Using longitudinal data to establish temporal precedence. Both direct and indirect effects should be reported and interpreted.';
    } else {
        recommendations = 'The absence of mediation suggests reconsidering the theoretical model. Consider: (1) Testing alternative mediators that might better explain the relationship, (2) Checking measurement validity of the mediator, (3) Examining if the relationship is direct rather than mediated, (4) Testing for moderation instead of mediation, (5) Considering reversed causal direction. Review the theoretical rationale and existing literature before proceeding.';
    }
    
    return {
        overall_analysis: overall,
        path_insights: insights,
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
                            <GitBranch className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Mediation Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Test whether a variable mediates the relationship between X and Y
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Direct Effect</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    X → Y pathway (c')
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <GitBranch className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Indirect Effect</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    X → M → Y pathway (a×b)
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Total Effect</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Combined influence (c)
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Mediation Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Mediation analysis tests whether the effect of an independent variable (X) on a dependent 
                            variable (Y) operates through a third variable called a mediator (M). This helps understand 
                            the mechanism or process by which X influences Y. Use this when you want to explain "how" 
                            or "why" a relationship exists, not just whether it exists.
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
                                        <span><strong>X Variable:</strong> Independent/predictor</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>M Variable:</strong> Mediator/mechanism</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Y Variable:</strong> Dependent/outcome</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Min Points:</strong> 100+ recommended</span>
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
                                        <span><strong>Full:</strong> Only indirect effect significant</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Partial:</strong> Both effects significant</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Bootstrap CI:</strong> More robust than Sobel</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Path Diagram:</strong> Visualizes relationships</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-2">
                        <Button 
                            onClick={() => {
                                const example = exampleDatasets.find(d => d.id === 'mediation') || exampleDatasets[0];
                                onLoadExample(example);
                            }} 
                            size="lg"
                        >
                            <GitBranch className="mr-2 h-5 w-5" />
                            Load Example Dataset
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

interface MediationAnalysisPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function MediationAnalysisPage({ data, numericHeaders, onLoadExample, onGenerateReport }: MediationAnalysisPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [xVar, setXVar] = useState<string | undefined>();
    const [mVar, setMVar] = useState<string | undefined>();
    const [yVar, setYVar] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 3, [data, numericHeaders]);
    
    useEffect(() => {
        if (numericHeaders.length >= 3) {
            setXVar(numericHeaders[0]);
            setMVar(numericHeaders[1]);
            setYVar(numericHeaders[2]);
        }
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!xVar || !mVar || !yVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select X, M, and Y variables.' });
            return;
        }

        if (xVar === mVar || xVar === yVar || mVar === yVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'X, M, and Y must be different variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/mediation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data: data, 
                    xVar, 
                    mVar, 
                    yVar
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            // Generate interpretations
            const interpretations = generateMediationInterpretations(result.results);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Mediation Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, xVar, mVar, yVar, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) {
            toast({ title: "No Data to Download", description: "Analysis results are not available." });
            return;
        }
        
        const bk = analysisResult.results.baron_kenny;
        const boot = analysisResult.results.bootstrap;
        
        const resultsData = [{
            mediation_type: analysisResult.results.mediation_type,
            path_a_coef: bk.path_a.coef,
            path_a_p: bk.path_a.p_value,
            path_b_coef: bk.path_b.coef,
            path_b_p: bk.path_b.p_value,
            path_c_coef: bk.path_c.coef,
            path_c_p: bk.path_c.p_value,
            path_c_prime_coef: bk.path_c_prime.coef,
            path_c_prime_p: bk.path_c_prime.p_value,
            indirect_effect: bk.indirect_effect,
            ...(boot && {
                bootstrap_mean: boot.mean_effect,
                bootstrap_ci_lower: boot.ci_lower,
                bootstrap_ci_upper: boot.ci_upper,
                bootstrap_significant: boot.significant
            })
        }];
        
        const csv = Papa.unparse(resultsData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mediation_analysis_results.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "Analysis results are being downloaded." });
    }, [analysisResult, toast]);

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;
    const bk = results?.baron_kenny;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Mediation Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select the independent variable (X), mediator (M), and dependent variable (Y).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Independent Variable (X)</Label>
                            <Select value={xVar} onValueChange={setXVar}>
                                <SelectTrigger><SelectValue placeholder="Select X"/></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Mediator (M)</Label>
                            <Select value={mVar} onValueChange={setMVar}>
                                <SelectTrigger><SelectValue placeholder="Select M"/></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.filter(h => h !== xVar).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Dependent Variable (Y)</Label>
                            <Select value={yVar} onValueChange={setYVar}>
                                <SelectTrigger><SelectValue placeholder="Select Y"/></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.filter(h => h !== xVar && h !== mVar).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {/* Analysis Overview */}
                    <MediationOverview 
                        xVar={xVar}
                        mVar={mVar}
                        yVar={yVar}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-between">
                    <div className="flex gap-2">
                        {results && (
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
                    <Button onClick={handleAnalysis} disabled={isLoading || !xVar || !mVar || !yVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Analyzing...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Running mediation analysis...</p>
                        <Skeleton className="h-[400px] w-full" />
                    </CardContent>
                </Card>
            )}

            {analysisResult && results && bk && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Detailed Analysis - 그래프 위에 배치 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <Activity className="h-5 w-5 text-primary" />
                                Detailed Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Overall Analysis - Primary Color */}
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <GitBranch className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Overall Summary</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.overall_analysis || '' }}
                                />
                            </div>

                            {/* Path Insights - Blue Color */}
                            {analysisResult.interpretations?.path_insights && analysisResult.interpretations.path_insights.length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-500/10 rounded-md">
                                            <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Statistical Insights</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {analysisResult.interpretations.path_insights.map((insight, idx) => (
                                            <div 
                                                key={idx}
                                                className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed"
                                            >
                                                <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">→</span>
                                                <div dangerouslySetInnerHTML={{ __html: insight }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommendations - Amber Color */}
                            <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-lg p-6 border border-amber-300 dark:border-amber-700">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-amber-500/10 rounded-md">
                                        <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <h3 className="font-semibold text-base">Recommendations</h3>
                                </div>
                                <div className="space-y-3">
                                    {analysisResult.interpretations?.recommendations.split(/(?:\(\d+\)|\d+\.)/).filter(Boolean).map((rec, idx) => (
                                        <div 
                                            key={idx}
                                            className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed"
                                        >
                                            <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">→</span>
                                            <span>{rec.trim()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Visualization - 그래프 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Mediation Model Visualization</CardTitle>
                            <CardDescription>
                                Path diagram, effect decomposition, bootstrap distribution, and coefficient summary
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image src={analysisResult.plot} alt="Mediation Analysis Plot" width={1400} height={1000} className="w-full rounded-md border"/>
                        </CardContent>
                    </Card>

                    {/* Path Coefficients Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Path Coefficients Summary</CardTitle>
                            <CardDescription>
                                Standardized coefficients for all mediation pathways
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Path</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Coefficient</TableHead>
                                        <TableHead className="text-right">SE</TableHead>
                                        <TableHead className="text-right">t/z</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-semibold">a</TableCell>
                                        <TableCell className="text-muted-foreground">X → M</TableCell>
                                        <TableCell className="font-mono text-right">{bk.path_a.coef.toFixed(3)}</TableCell>
                                        <TableCell className="font-mono text-right">{bk.path_a.se.toFixed(3)}</TableCell>
                                        <TableCell className="font-mono text-right">{bk.path_a.t_stat.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={bk.path_a.p_value < 0.05 ? 'default' : 'secondary'}>
                                                {bk.path_a.p_value < 0.001 ? '<.001' : bk.path_a.p_value.toFixed(3)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-semibold">b</TableCell>
                                        <TableCell className="text-muted-foreground">M → Y</TableCell>
                                        <TableCell className="font-mono text-right">{bk.path_b.coef.toFixed(3)}</TableCell>
                                        <TableCell className="font-mono text-right">{bk.path_b.se.toFixed(3)}</TableCell>
                                        <TableCell className="font-mono text-right">{bk.path_b.t_stat.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={bk.path_b.p_value < 0.05 ? 'default' : 'secondary'}>
                                                {bk.path_b.p_value < 0.001 ? '<.001' : bk.path_b.p_value.toFixed(3)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-semibold">c'</TableCell>
                                        <TableCell className="text-muted-foreground">X → Y (direct)</TableCell>
                                        <TableCell className="font-mono text-right">{bk.path_c_prime.coef.toFixed(3)}</TableCell>
                                        <TableCell className="font-mono text-right">{bk.path_c_prime.se.toFixed(3)}</TableCell>
                                        <TableCell className="font-mono text-right">{bk.path_c_prime.t_stat.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={bk.path_c_prime.p_value < 0.05 ? 'default' : 'secondary'}>
                                                {bk.path_c_prime.p_value < 0.001 ? '<.001' : bk.path_c_prime.p_value.toFixed(3)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-semibold">c</TableCell>
                                        <TableCell className="text-muted-foreground">X → Y (total)</TableCell>
                                        <TableCell className="font-mono text-right">{bk.path_c.coef.toFixed(3)}</TableCell>
                                        <TableCell className="font-mono text-right">{bk.path_c.se.toFixed(3)}</TableCell>
                                        <TableCell className="font-mono text-right">{bk.path_c.t_stat.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={bk.path_c.p_value < 0.05 ? 'default' : 'secondary'}>
                                                {bk.path_c.p_value < 0.001 ? '<.001' : bk.path_c.p_value.toFixed(3)}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                    <TableRow className="bg-muted/50">
                                        <TableCell className="font-semibold">a×b</TableCell>
                                        <TableCell className="text-muted-foreground">Indirect effect</TableCell>
                                        <TableCell className="font-mono text-right">{bk.indirect_effect.toFixed(3)}</TableCell>
                                        <TableCell className="font-mono text-right">
                                            {results.bootstrap ? results.bootstrap.se.toFixed(3) : bk.sobel_test.se.toFixed(3)}
                                        </TableCell>
                                        <TableCell className="font-mono text-right">
                                            {results.bootstrap ? '—' : bk.sobel_test.z_stat.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {results.bootstrap ? (
                                                <Badge variant={results.bootstrap.significant ? 'default' : 'secondary'}>
                                                    Bootstrap
                                                </Badge>
                                            ) : (
                                                <Badge variant={bk.sobel_test.p_value < 0.05 ? 'default' : 'secondary'}>
                                                    {bk.sobel_test.p_value < 0.001 ? '<.001' : bk.sobel_test.p_value.toFixed(3)}
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>

                            {/* Bootstrap Results Section */}
                            {results.bootstrap && (
                                <div className="mt-6 p-4 bg-muted/30 rounded-lg border">
                                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-primary" />
                                        Bootstrap Analysis Results
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Mean Effect</p>
                                            <p className="font-mono font-semibold">{results.bootstrap.mean_effect.toFixed(4)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Standard Error</p>
                                            <p className="font-mono font-semibold">{results.bootstrap.se.toFixed(4)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">95% CI</p>
                                            <p className={`font-mono font-semibold ${results.bootstrap.significant ? 'text-green-600' : 'text-gray-600'}`}>
                                                [{results.bootstrap.ci_lower.toFixed(4)}, {results.bootstrap.ci_upper.toFixed(4)}]
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Significance</p>
                                            <Badge variant={results.bootstrap.significant ? 'default' : 'secondary'}>
                                                {results.bootstrap.significant ? 'Significant' : 'Not Significant'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-3">
                                        Based on {results.bootstrap.n_bootstrap.toLocaleString()} bootstrap samples. 
                                        CI {results.bootstrap.significant ? 'does not include' : 'includes'} zero.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <p className="text-xs text-muted-foreground">
                                All coefficients are standardized. Bootstrap confidence interval: 95%
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <GitBranch className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select variables and click &apos;Run Analysis&apos; to test mediation.</p>
                </div>
            )}
        </div>
    );
}