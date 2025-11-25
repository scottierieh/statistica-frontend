'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Network, CheckCircle, XCircle, HelpCircle, Bot, Download, Settings, FileSearch, TrendingUp, AlertTriangle, BookOpen, GitBranch, Zap, Activity, Percent, Target, BarChart, Info, Lightbulb } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import Papa from 'papaparse';

interface PathResult {
    coefficients: number[];
    p_values: number[];
}

interface SimpleSlope {
    label: string;
    slope: number;
    p_value: number;
}

interface ModerationResults {
    step1: PathResult;
    step2: PathResult;
    r_squared_change: { delta_r2: number; f_change: number; p_change: number };
    simple_slopes: SimpleSlope[];
    interpretation: string;
}

interface FullAnalysisResponse {
    results: ModerationResults;
    plot: string;
    interpretations?: {
        overall_analysis: string;
        interaction_insights: string[];
        recommendations: string;
    };
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: ModerationResults }) => {
    const deltaR2 = results.r_squared_change.delta_r2;
    const isSignificant = results.r_squared_change.p_change < 0.05;
    const significantSlopes = results.simple_slopes.filter(s => s.p_value < 0.05).length;
    const fChange = results.r_squared_change.f_change;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Interaction Significance Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Interaction
                            </p>
                            <GitBranch className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${isSignificant ? 'text-green-600' : 'text-gray-600'}`}>
                            {isSignificant ? 'Significant' : 'Not Sig.'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            p = {results.r_squared_change.p_change.toFixed(3)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Delta R² Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                ΔR²
                            </p>
                            <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {(deltaR2 * 100).toFixed(2)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Added by interaction
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* F-Change Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                F-Change
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {fChange.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Model improvement
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Significant Slopes Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Sig. Slopes
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {significantSlopes}/{results.simple_slopes.length}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            At different levels
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component
const ModerationOverview = ({ xVar, yVar, mVar, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable configuration
        if (xVar && yVar && mVar) {
            overview.push(`X (Independent): ${xVar}`);
            overview.push(`M (Moderator): ${mVar}`);
            overview.push(`Y (Dependent): ${yVar}`);
        } else {
            overview.push('Select all three variables to run moderation analysis');
        }

        // Sample size assessment
        const n = data.length;
        if (n < 50) {
            overview.push(`Sample size: ${n} observations (⚠ Small for moderation analysis)`);
        } else if (n < 100) {
            overview.push(`Sample size: ${n} observations (Adequate)`);
        } else if (n < 200) {
            overview.push(`Sample size: ${n} observations (Good)`);
        } else {
            overview.push(`Sample size: ${n} observations (Excellent)`);
        }

        // Power considerations
        if (n < 100) {
            overview.push('⚠ May have limited power to detect interaction effects');
        }

        // Analysis info
        overview.push('Method: Hierarchical regression with interaction term');
        overview.push('Step 1: Main effects (X and M)');
        overview.push('Step 2: Add interaction (X × M)');
        overview.push('Simple slopes tested at -1SD, mean, +1SD');
        overview.push('Variables will be centered for analysis');

        return overview;
    }, [xVar, yVar, mVar, data]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Analysis Overview</CardTitle>
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

// Generate interpretations
const generateModerationInterpretations = (results: ModerationResults) => {
    const insights: string[] = [];
    const isSignificant = results.r_squared_change.p_change < 0.05;
    
    let overall = '';
    if (isSignificant) {
        overall = '<strong>Significant moderation effect detected.</strong> The relationship between the independent variable (X) and dependent variable (Y) varies significantly depending on the level of the moderator (M). This indicates that the moderator changes the strength or direction of the X-Y relationship, answering "when" or "for whom" the effect occurs.';
    } else {
        overall = '<strong>No significant moderation effect detected.</strong> The interaction term (X×M) is not statistically significant, suggesting that the relationship between X and Y does not meaningfully vary across different levels of M. The main effects model may be more appropriate for your data.';
    }
    
    // ΔR² insight
    insights.push(`<strong>R² Change:</strong> The interaction term added ${(results.r_squared_change.delta_r2 * 100).toFixed(2)}% to the variance explained (ΔR² = ${results.r_squared_change.delta_r2.toFixed(4)}). This represents the unique contribution of the moderation effect beyond the main effects.`);
    
    // F-change insight
    insights.push(`<strong>F-Change Test:</strong> F = ${results.r_squared_change.f_change.toFixed(2)}, p ${results.r_squared_change.p_change < 0.001 ? '< .001' : `= ${results.r_squared_change.p_change.toFixed(3)}`}. This tests whether adding the interaction term significantly improves model fit.`);
    
    // Simple slopes insights
    const lowSlope = results.simple_slopes.find(s => s.label.includes('Low') || s.label.includes('-1'));
    const meanSlope = results.simple_slopes.find(s => s.label.includes('Mean') || s.label.includes('0'));
    const highSlope = results.simple_slopes.find(s => s.label.includes('High') || s.label.includes('+1'));
    
    if (lowSlope) {
        insights.push(`<strong>At Low M (-1SD):</strong> The effect of X on Y is ${lowSlope.slope.toFixed(3)} (p ${lowSlope.p_value < 0.001 ? '< .001' : `= ${lowSlope.p_value.toFixed(3)}`}), ${lowSlope.p_value < 0.05 ? 'which is significant' : 'which is not significant'}.`);
    }
    if (meanSlope) {
        insights.push(`<strong>At Mean M:</strong> The effect of X on Y is ${meanSlope.slope.toFixed(3)} (p ${meanSlope.p_value < 0.001 ? '< .001' : `= ${meanSlope.p_value.toFixed(3)}`}), ${meanSlope.p_value < 0.05 ? 'which is significant' : 'which is not significant'}.`);
    }
    if (highSlope) {
        insights.push(`<strong>At High M (+1SD):</strong> The effect of X on Y is ${highSlope.slope.toFixed(3)} (p ${highSlope.p_value < 0.001 ? '< .001' : `= ${highSlope.p_value.toFixed(3)}`}), ${highSlope.p_value < 0.05 ? 'which is significant' : 'which is not significant'}.`);
    }
    
    // Slope pattern insight
    if (lowSlope && highSlope) {
        const slopeChange = highSlope.slope - lowSlope.slope;
        if (Math.abs(slopeChange) > 0.1) {
            if (slopeChange > 0) {
                insights.push(`<strong>Pattern:</strong> The effect of X on Y strengthens as M increases (enhancing moderation). The relationship is weaker at low M and stronger at high M.`);
            } else {
                insights.push(`<strong>Pattern:</strong> The effect of X on Y weakens as M increases (buffering moderation). The relationship is stronger at low M and weaker at high M.`);
            }
        }
    }
    
    // Recommendations
    let recommendations = '';
    if (isSignificant) {
        recommendations = 'The significant moderation suggests: (1) Report both the interaction effect and simple slopes at different M levels, (2) Include the interaction plot in publications as it clearly shows the pattern, (3) Consider the practical significance - does the change in slopes matter in your context?, (4) Test for higher-order interactions if theoretically justified, (5) Examine regions of significance to identify specific M values where X affects Y, (6) Consider three-way interactions if you have additional moderators. Always interpret moderation effects in light of your theoretical framework.';
    } else {
        recommendations = 'Without significant moderation: (1) Focus on reporting and interpreting the main effects of X and M on Y, (2) Consider whether you have sufficient power to detect the interaction (N < 100 may be underpowered), (3) Check if the moderator was measured reliably and has adequate variance, (4) Explore whether M might be a mediator instead of a moderator, (5) Consider alternative moderators suggested by theory, (6) Examine whether the relationship is more complex (e.g., curvilinear effects). Remember that absence of evidence is not evidence of absence - null results should be interpreted cautiously.';
    }
    
    return {
        overall_analysis: overall,
        interaction_insights: insights,
        recommendations: recommendations
    };
};

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Network className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Moderation Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Discover when and for whom relationships between variables change
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <GitBranch className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Interaction Effects</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Test if relationships vary by conditions
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Zap className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Simple Slopes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Analyze effects at different moderator levels
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Visual Insights</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    See how relationships change graphically
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Moderation Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use moderation analysis when you suspect the relationship between two variables depends 
                            on a third variable. It answers &quot;when&quot; or &quot;for whom&quot; questions - for example, does stress 
                            affect performance differently for people with high vs. low social support? Perfect for 
                            understanding boundary conditions and contextual factors.
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
                                        <span><strong>Variables:</strong> 3 continuous variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> Minimum 50, ideally 100+</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Theory:</strong> Clear moderation hypothesis</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Centering:</strong> Variables auto-centered</span>
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
                                        <span><strong>X×M term:</strong> Significant = moderation exists</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>ΔR²:</strong> Variance added by interaction</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Simple slopes:</strong> Effects at low/mean/high M</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Plot:</strong> Visual interaction pattern</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center pt-2">
                        <Button 
                            onClick={() => {
                                const example = exampleDatasets.find(d => d.id === 'stress-support') || exampleDatasets[0];
                                onLoadExample(example);
                            }} 
                            size="lg"
                        >
                            <Network className="mr-2 h-5 w-5" />
                            Load Example Dataset
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

interface ModerationPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function ModerationPage({ data, numericHeaders, onLoadExample, onGenerateReport }: ModerationPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [xVar, setXVar] = useState<string | undefined>();
    const [yVar, setYVar] = useState<string | undefined>();
    const [mVar, setMVar] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 3, [data, numericHeaders]);

    useEffect(() => {
        setXVar(numericHeaders[0] || undefined);
        setMVar(numericHeaders[1] || undefined);
        setYVar(numericHeaders[2] || undefined);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!xVar || !yVar || !mVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select X, Y, and M variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/moderation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, xVar, yVar, mVar })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Generate interpretations
            const interpretations = generateModerationInterpretations(result.results);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, xVar, yVar, mVar, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) {
            toast({ title: "No Data to Download", description: "Analysis results are not available." });
            return;
        }
        
        const resultsData = [{
            delta_r2: analysisResult.results.r_squared_change.delta_r2,
            f_change: analysisResult.results.r_squared_change.f_change,
            p_change: analysisResult.results.r_squared_change.p_change,
            ...Object.fromEntries(
                analysisResult.results.simple_slopes.map((s, i) => [
                    [`slope_${i}_level`, s.label],
                    [`slope_${i}_value`, s.slope],
                    [`slope_${i}_p`, s.p_value]
                ]).flat().map((item, idx, arr) => [arr[idx][0], arr[idx][1]])
            )
        }];
        
        const csv = Papa.unparse(resultsData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'moderation_analysis_results.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "Analysis results are being downloaded." });
    }, [analysisResult, toast]);

    const availableForM = numericHeaders.filter(h => h !== xVar && h !== yVar);
    const availableForY = numericHeaders.filter(h => h !== xVar && h !== mVar);
    
    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Moderation Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Test if the relationship between X and Y changes at different levels of moderator M</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Independent Variable (X)</Label>
                            <Select value={xVar} onValueChange={setXVar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Moderator Variable (M)</Label>
                            <Select value={mVar} onValueChange={setMVar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {availableForM.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Dependent Variable (Y)</Label>
                            <Select value={yVar} onValueChange={setYVar}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {availableForY.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    {/* Overview Component */}
                    <ModerationOverview 
                        xVar={xVar}
                        yVar={yVar}
                        mVar={mVar}
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
                    <Button onClick={handleAnalysis} disabled={isLoading || !xVar || !yVar || !mVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Running Moderation Analysis...</p>
                        <Skeleton className="h-96 w-full" />
                    </CardContent>
                </Card>
            )}
            
            {results && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Detailed Analysis - 그래프 위에 배치 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <Network className="h-5 w-5 text-primary" />
                                Detailed Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Overall Analysis - Primary Color */}
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <Network className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Overall Summary</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.overall_analysis || '' }}
                                />
                            </div>

                            {/* Interaction Insights - Blue Color */}
                            {analysisResult.interpretations?.interaction_insights && analysisResult.interpretations.interaction_insights.length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-500/10 rounded-md">
                                            <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Statistical Insights</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {analysisResult.interpretations.interaction_insights.map((insight, idx) => (
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

                    {/* Interaction Plot - 그래프 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Interaction Plot</CardTitle>
                            <CardDescription>Visual representation of the moderation effect</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {analysisResult?.plot && 
                                <Image 
                                    src={analysisResult.plot} 
                                    alt="Moderation Plot" 
                                    width={800} 
                                    height={600} 
                                    className="w-full rounded-md border"
                                />
                            }
                        </CardContent>
                    </Card>
                    
                    {/* Simple Slopes Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Simple Slopes Analysis</CardTitle>
                            <CardDescription>X-Y relationship at different moderator levels</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Moderator Level</TableHead>
                                        <TableHead className="text-right">Slope of X on Y</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                        <TableHead className="text-right">Significance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.simple_slopes.map(slope => (
                                        <TableRow key={slope.label}>
                                            <TableCell className="font-semibold">{slope.label}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {slope.slope.toFixed(4)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">
                                                {slope.p_value < 0.001 ? '<.001' : slope.p_value.toFixed(4)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {slope.p_value < 0.05 ? 
                                                    <Badge>Significant</Badge> : 
                                                    <Badge variant="secondary">Not Sig.</Badge>
                                                }
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    
                    {/* Model Comparison */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Model Comparison</CardTitle>
                            <CardDescription>Hierarchical regression results</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Model</TableHead>
                                        <TableHead className="text-right">ΔR²</TableHead>
                                        <TableHead className="text-right">F-Change</TableHead>
                                        <TableHead className="text-right">p-value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>Step 1: Main Effects (X, M)</TableCell>
                                        <TableCell className="text-right font-mono">—</TableCell>
                                        <TableCell className="text-right font-mono">—</TableCell>
                                        <TableCell className="text-right font-mono">—</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Step 2: + Interaction (X×M)</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {results.r_squared_change.delta_r2.toFixed(4)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {results.r_squared_change.f_change.toFixed(3)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {results.r_squared_change.p_change < 0.001 ? '<.001' : results.r_squared_change.p_change.toFixed(4)}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}
            
            {!isLoading && !analysisResult && (
                <div className="text-center text-muted-foreground py-10">
                    <Network className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select variables and click &apos;Run Analysis&apos; to see results.</p>
                </div>
            )}
        </div>
    );
}

