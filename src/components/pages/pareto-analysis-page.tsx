'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BarChart, HelpCircle, Settings, FileSearch, CheckCircle, TrendingUp, AlertCircle, Target, Filter, Activity, Zap, BookOpen, Download, Bot, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Papa from 'papaparse';
import dynamic from 'next/dynamic';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), { 
    ssr: false,
    loading: () => <Skeleton className="w-full h-[600px]" />
});

interface ParetoResult {
    table: {
        Value: string;
        Amount: number;
        Percentage: number;
        'Cumulative Percentage': number;
        Priority: 'High' | 'Low';
    }[];
    plot: string; // JSON string from Plotly
    insights: {
        vital_few_count: number;
        total_categories: number;
        vital_few_percentage: number;
        vital_few_contribution: number;
        top_3_items: string[];
        top_3_contribution: number;
        concentration_index: number;
        interpretation: string;
        severity: 'high' | 'medium' | 'low';
    };
    filter_info: {
        applied: boolean;
        showing?: number;
        total?: number;
    };
}

interface FullAnalysisResponse {
    results: ParetoResult;
    interpretations?: {
        overall_analysis: string;
        test_insights: string[];
        recommendations: string[];
    };
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: ParetoResult }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Vital Few Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Vital Few
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {results.insights.vital_few_count}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            of {results.insights.total_categories} categories
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Contribution Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Contribution
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {results.insights.vital_few_contribution}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            of total impact
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Top 3 Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Top 3 Impact
                            </p>
                            <Zap className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {results.insights.top_3_contribution}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            from 3 items
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Concentration Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Concentration
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold font-mono">
                            {results.insights.concentration_index}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.insights.severity === 'high' ? 'High focus' : 
                             results.insights.severity === 'medium' ? 'Moderate' : 'Distributed'}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Generate interpretations
const generateParetoInterpretations = (results: ParetoResult) => {
    const insights: string[] = [];
    const vitalFew = results.insights.vital_few_count;
    const totalCats = results.insights.total_categories;
    const contribution = results.insights.vital_few_contribution;
    const vitalPct = results.insights.vital_few_percentage;
    
    // Overall analysis
    let overall = '';
    if (results.insights.severity === 'high') {
        overall = `<strong>Strong Pareto effect detected (80/20 principle confirmed).</strong> Just ${vitalFew} categories (${vitalPct}% of total) account for ${contribution}% of the impact. This high concentration indicates that focusing resources on these vital few items will yield maximum efficiency. The remaining ${totalCats - vitalFew} categories contribute only ${100 - contribution}% combined, representing the "trivial many" that require less immediate attention.`;
    } else if (results.insights.severity === 'medium') {
        overall = `<strong>Moderate concentration pattern observed.</strong> ${vitalFew} categories (${vitalPct}% of total) contribute ${contribution}% of the impact, showing a noticeable but less extreme Pareto effect than the classic 80/20 rule. While prioritizing these high-impact items is still valuable, the remaining ${totalCats - vitalFew} categories contribute ${100 - contribution}% and may also require attention for comprehensive improvement.`;
    } else {
        overall = `<strong>Distributed impact with weak Pareto effect.</strong> ${vitalFew} categories (${vitalPct}% of total) contribute ${contribution}% of the impact, indicating that influence is relatively evenly distributed across categories. The classic 80/20 principle does not strongly apply here. This suggests that addressing multiple categories simultaneously may be necessary rather than focusing only on a few items.`;
    }
    
    // Vital few insight
    insights.push(`<strong>Vital Few Categories:</strong> ${vitalFew} out of ${totalCats} categories (${vitalPct}%) are classified as high priority, collectively contributing ${contribution}% of total impact. These represent the critical focus areas where interventions will have the greatest effect. The 80% cumulative threshold is the standard benchmark for identifying the vital few.`);
    
    // Top contributors insight
    const top3List = results.insights.top_3_items.slice(0, 3).join(', ');
    insights.push(`<strong>Top 3 Contributors:</strong> The leading items are: ${top3List}. These three alone account for ${results.insights.top_3_contribution}% of total impact (${((results.insights.top_3_contribution / contribution) * 100).toFixed(1)}% of the vital few contribution). Immediate action on these specific items will deliver quick wins and significant improvements.`);
    
    // Concentration index insight
    if (results.insights.concentration_index > 50) {
        insights.push(`<strong>High Concentration Index:</strong> Index of ${results.insights.concentration_index} indicates extremely concentrated impact. A small number of categories dominate the distribution. This makes prioritization straightforward—focus intensively on the top items for maximum ROI.`);
    } else if (results.insights.concentration_index > 30) {
        insights.push(`<strong>Moderate Concentration Index:</strong> Index of ${results.insights.concentration_index} shows moderate concentration. While top categories are important, the impact is not extremely concentrated. Balance efforts between addressing vital few and monitoring other significant contributors.`);
    } else {
        insights.push(`<strong>Low Concentration Index:</strong> Index of ${results.insights.concentration_index} indicates distributed impact across many categories. No single category dominates overwhelmingly. This suggests a more holistic approach may be needed rather than narrow focus on just a few items.`);
    }
    
    // Filter info insight
    if (results.filter_info.applied) {
        insights.push(`<strong>Filtered Analysis:</strong> Results show top ${results.filter_info.showing} of ${results.filter_info.total} categories. The filtered view highlights the most significant items, but ${(results.filter_info.total || 0) - (results.filter_info.showing || 0)} additional categories exist that may still have some impact.`);
    }
    
    // Data quality insight
    insights.push(`<strong>Data Coverage:</strong> Analysis includes ${totalCats} unique categories. ${vitalFew} categories exceed the 80% cumulative threshold (vital few), while ${totalCats - vitalFew} categories make up the remaining 20% (trivial many). This clear segmentation enables effective prioritization and resource allocation.`);
    
    // Recommendations
    let recommendations: string[] = [];
    if (results.insights.severity === 'high') {
        recommendations = [
            `<strong>Prioritize the ${vitalFew} vital few categories</strong> that drive ${contribution}% of impact—these are your highest ROI opportunities`,
            '<strong>Allocate 80% of resources</strong> to addressing the vital few, reserving only 20% for the trivial many',
            `<strong>Start with the top 3:</strong> ${top3List}—these offer immediate, high-impact wins`,
            '<strong>Monitor vital few continuously</strong> to ensure they remain under control and don\'t worsen',
            '<strong>Establish prevention measures</strong> for vital few to avoid recurrence and maintain gains',
            '<strong>Document root causes</strong> of vital few items to enable knowledge sharing and systematic improvement'
        ];
    } else if (results.insights.severity === 'medium') {
        recommendations = [
            `<strong>Focus primarily on ${vitalFew} high-priority categories</strong> (${contribution}% of impact) but don't ignore others entirely`,
            '<strong>Allocate resources proportionally:</strong> 60% to vital few, 30% to next tier, 10% to remaining',
            `<strong>Quick wins from top 3:</strong> ${top3List}—address these first for visible progress`,
            '<strong>Monitor the "middle tier"</strong> categories that don\'t make vital few but still contribute significantly',
            '<strong>Re-analyze periodically</strong> as addressing top items may shift importance to currently lower-ranked categories',
            '<strong>Consider category interactions</strong> since moderate concentration suggests some interdependencies'
        ];
    } else {
        recommendations = [
            `<strong>Distributed impact requires broader approach:</strong> ${vitalFew} categories contribute ${contribution}%—not as concentrated as typical 80/20`,
            '<strong>Address multiple categories simultaneously</strong> rather than narrow focus on just a few items',
            '<strong>Still start with top 3:</strong> ${top3List}—but recognize others are also significant',
            '<strong>Look for common causes</strong> across multiple categories that could be addressed together',
            '<strong>Consider system-level improvements</strong> that benefit many categories rather than item-by-item fixes',
            '<strong>Use additional analysis methods</strong> (root cause, process mapping) to identify leverage points beyond simple frequency'
        ];
    }
    
    return {
        overall_analysis: overall,
        test_insights: insights,
        recommendations: recommendations
    };
};

// Overview Component
const ParetoOverview = ({ 
    categoryVariable, 
    useValueVariable, 
    valueVariable, 
    useTopNFilter, 
    filterTopN, 
    dataLength 
}: {
    categoryVariable?: string;
    useValueVariable: boolean;
    valueVariable?: string;
    useTopNFilter: boolean;
    filterTopN: string;
    dataLength: number;
}) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Analysis type
        if (useValueVariable && valueVariable) {
            overview.push(`Analysis Type: Pareto by ${valueVariable} (aggregated values)`);
        } else {
            overview.push('Analysis Type: Pareto by frequency (count-based)');
        }
        
        // Category variable
        if (categoryVariable) {
            overview.push(`Category Variable: ${categoryVariable}`);
        } else {
            overview.push('Select a category variable');
        }
        
        // Value variable
        if (useValueVariable) {
            if (valueVariable) {
                overview.push(`Value Variable: ${valueVariable}`);
            } else {
                overview.push('Select a value variable for aggregation');
            }
        }
        
        // Filter info
        if (useTopNFilter && filterTopN) {
            overview.push(`Filter: Top ${filterTopN} categories`);
        } else {
            overview.push('Filter: All categories included');
        }
        
        // Data info
        overview.push(`Total Data Points: ${dataLength}`);
        
        // Principle
        overview.push('80/20 Principle: Focus on vital few (≤80% cumulative)');
        overview.push('Goal: Identify high-impact items for resource allocation');
        
        return overview;
    }, [categoryVariable, useValueVariable, valueVariable, useTopNFilter, filterTopN, dataLength]);

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

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const paretoExample = exampleDatasets.find(d => d.id === 'pareto-data');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <BarChart className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Interactive Pareto Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Identify the vital few from the trivial many using the 80/20 rule with interactive visualizations
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">80/20 Principle</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identify the vital few items that contribute to 80% of the total impact
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Visual Insights</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Interactive charts with cumulative curves show concentration patterns
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Flexible Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Analyze by frequency or aggregated values with optional filtering
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Pareto Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Pareto Analysis is a statistical technique for prioritization that uses the Pareto Principle 
                            (the 80/20 rule). It identifies which categories contribute the most to your total impact, 
                            helping you focus efforts where they matter most. The analysis ranks items by contribution 
                            and shows cumulative percentages to reveal concentration patterns.
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
                                        <span><strong>Category variable:</strong> Categorical data</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Value variable:</strong> Optional numeric values</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Filtering:</strong> Optional top N limit</span>
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
                                        <span><strong>Vital few:</strong> High-priority items</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Cumulative curve:</strong> Shows 80% threshold</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Concentration:</strong> Degree of focus needed</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {paretoExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(paretoExample)} size="lg">
                                <BarChart className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface ParetoAnalysisPageProps {
    data: DataSet;
    categoricalHeaders: string[];
    numericalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function ParetoAnalysisPage({ data, categoricalHeaders, numericalHeaders, onLoadExample, onGenerateReport }: ParetoAnalysisPageProps) {
    const { toast } = useToast();
    const [categoryVariable, setCategoryVariable] = useState<string | undefined>(categoricalHeaders?.[0]);
    const [useValueVariable, setUseValueVariable] = useState(false);
    const [valueVariable, setValueVariable] = useState<string | undefined>(numericalHeaders?.[0] || undefined);
    const [filterTopN, setFilterTopN] = useState<string>('');
    const [useTopNFilter, setUseTopNFilter] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [plotData, setPlotData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showIntro, setShowIntro] = useState(data.length === 0);

    const canRun = useMemo(() => data.length > 0 && categoricalHeaders.length > 0, [data, categoricalHeaders]);
    const hasNumericalData = useMemo(() => numericalHeaders && numericalHeaders.length > 0, [numericalHeaders]);
    
    useEffect(() => {
        setCategoryVariable(categoricalHeaders?.[0]);
        setValueVariable(numericalHeaders?.[0] || undefined);
        setAnalysisResult(null);
        setPlotData(null);
        setShowIntro(data.length === 0 || categoricalHeaders.length === 0);
        setUseValueVariable(false);
        setUseTopNFilter(false);
        setFilterTopN('');
    }, [data, categoricalHeaders, numericalHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!categoryVariable) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a category variable.' });
            return;
        }

        if (useValueVariable && !valueVariable) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a value variable or disable the value option.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        setPlotData(null);

        try {
            const payload: any = { data, variable: categoryVariable };
            if (useValueVariable && valueVariable) {
                payload.valueVariable = valueVariable;
            }
            if (useTopNFilter && filterTopN) {
                const topN = parseInt(filterTopN);
                if (!isNaN(topN) && topN > 0) {
                    payload.filterTopN = topN;
                }
            }

            const response = await fetch('/api/analysis/pareto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: any = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Parse Plotly JSON
            const plotJson = JSON.parse(result.plot);
            setPlotData(plotJson);
            
            // Generate interpretations
            const interpretations = generateParetoInterpretations(result);
            const fullResult: FullAnalysisResponse = {
                results: result,
                interpretations: interpretations
            };
            
            setAnalysisResult(fullResult);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, categoryVariable, useValueVariable, valueVariable, useTopNFilter, filterTopN, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) return;
        
        const csv = Papa.unparse(analysisResult.results.table);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'pareto_analysis_results.csv';
        link.click();
        URL.revokeObjectURL(url);
        
        toast({ title: 'Download Started', description: 'Pareto analysis results are being downloaded.' });
    }, [analysisResult, toast]);

    if (showIntro || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Pareto Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setShowIntro(true)}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>Configure category, value variable, and optional filtering</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div>
                        <Label>Category Variable (Required)</Label>
                        <Select value={categoryVariable} onValueChange={setCategoryVariable}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category..." />
                            </SelectTrigger>
                            <SelectContent>
                                {categoricalHeaders.map(h => (
                                    <SelectItem key={h} value={h}>{h}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {hasNumericalData && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Use Value Variable (Optional)</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Enable to analyze by aggregated values instead of frequency
                                    </p>
                                </div>
                                <Switch 
                                    checked={useValueVariable} 
                                    onCheckedChange={setUseValueVariable}
                                />
                            </div>
                            
                            {useValueVariable && (
                                <div>
                                    <Label>Value Variable</Label>
                                    <Select value={valueVariable} onValueChange={setValueVariable}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a value..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {numericalHeaders.map(h => (
                                                <SelectItem key={h} value={h}>{h}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-3 border-t pt-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="flex items-center gap-2">
                                    <Target className="w-4 h-4" />
                                    Limit to Top N Categories (Optional)
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Focus on the most significant items only
                                </p>
                            </div>
                            <Switch 
                                checked={useTopNFilter} 
                                onCheckedChange={setUseTopNFilter}
                            />
                        </div>
                        
                        {useTopNFilter && (
                            <div>
                                <Label>Number of Top Categories</Label>
                                <Input 
                                    type="number" 
                                    min="1"
                                    placeholder="e.g., 10" 
                                    value={filterTopN}
                                    onChange={(e) => setFilterTopN(e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                    
                    {/* Overview Component */}
                    <ParetoOverview
                        categoryVariable={categoryVariable}
                        useValueVariable={useValueVariable}
                        valueVariable={valueVariable}
                        useTopNFilter={useTopNFilter}
                        filterTopN={filterTopN}
                        dataLength={data.length}
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
                    <Button 
                        onClick={handleAnalysis} 
                        disabled={isLoading || !categoryVariable || (useValueVariable && !valueVariable)}
                    >
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Generating Pareto analysis...</p>
                        <Skeleton className="h-96 w-full"/>
                    </CardContent>
                </Card>
            )}

            {analysisResult && results && plotData && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Analysis Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Analysis Summary</CardTitle>
                            <CardDescription>Pareto principle assessment and priority identification</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert variant={results.insights.severity === 'high' ? 'default' : 'default'}>
                                {results.insights.severity === 'high' ? 
                                    <CheckCircle2 className="h-4 w-4" /> : 
                                    <Info className="h-4 w-4" />
                                }
                                <AlertTitle>
                                    {results.insights.severity === 'high' ? 'Strong 80/20 Effect' :
                                     results.insights.severity === 'medium' ? 'Moderate Concentration' :
                                     'Distributed Impact'}
                                </AlertTitle>
                                <AlertDescription>
                                    {results.insights.interpretation}
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Detailed Analysis */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <BarChart className="h-5 w-5 text-primary" />
                                Detailed Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Overall Analysis */}
                            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/40">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-primary/10 rounded-md">
                                        <Target className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-base">Pareto Effect Assessment</h3>
                                </div>
                                <div 
                                    className="text-sm text-foreground/80 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.overall_analysis || '' }}
                                />
                            </div>

                            {/* Key Insights */}
                            {analysisResult.interpretations?.test_insights && analysisResult.interpretations.test_insights.length > 0 && (
                                <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 rounded-lg p-6 border border-blue-300 dark:border-blue-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-blue-500/10 rounded-md">
                                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Key Insights</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {analysisResult.interpretations.test_insights.map((insight, idx) => (
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
                            {analysisResult.interpretations?.recommendations && analysisResult.interpretations.recommendations.length > 0 && (
                                <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 rounded-lg p-6 border border-amber-300 dark:border-amber-700">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="p-2 bg-amber-500/10 rounded-md">
                                            <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <h3 className="font-semibold text-base">Recommendations</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {analysisResult.interpretations.recommendations.map((rec, idx) => (
                                            <li 
                                                key={idx}
                                                className="flex items-start gap-3 text-sm text-foreground/80 leading-relaxed"
                                            >
                                                <span className="text-amber-600 dark:text-amber-400 font-bold mt-0.5">•</span>
                                                <div dangerouslySetInnerHTML={{ __html: rec }} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Interactive Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Interactive Pareto Chart</CardTitle>
                            <CardDescription>
                                Hover over bars for details. Click and drag to zoom. Use toolbar to export or reset view.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="w-full">
                                {plotData && plotData.data && plotData.layout ? (
                                    <Plot
                                        data={plotData.data}
                                        layout={{
                                            ...plotData.layout,
                                            autosize: true,
                                        }}
                                        config={{
                                            displayModeBar: true,
                                            displaylogo: false,
                                            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                                            toImageButtonOptions: {
                                                format: 'png',
                                                filename: 'pareto_chart',
                                                height: 800,
                                                width: 1400,
                                                scale: 2
                                            }
                                        }}
                                        style={{ width: '100%', height: '600px' }}
                                        useResizeHandler={true}
                                        className="w-full"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-[600px] bg-muted/20 rounded-lg">
                                        <p className="text-muted-foreground">Loading chart...</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Data Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Detailed Analysis Table</CardTitle>
                            <CardDescription>Complete breakdown with priority levels and cumulative percentages</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Priority</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead className="text-right">{useValueVariable && valueVariable ? valueVariable : 'Frequency'}</TableHead>
                                            <TableHead className="text-right">%</TableHead>
                                            <TableHead className="text-right">Cumulative %</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.table.map((row, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <Badge variant={row.Priority === 'High' ? 'default' : 'secondary'}>
                                                        {row.Priority}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-medium">{String(row.Value)}</TableCell>
                                                <TableCell className="text-right font-mono">{row.Amount.toLocaleString()}</TableCell>
                                                <TableCell className="text-right font-mono">{row.Percentage.toFixed(1)}%</TableCell>
                                                <TableCell className="text-right font-mono font-semibold">{row['Cumulative Percentage'].toFixed(1)}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <p className="text-xs text-muted-foreground">
                                High priority items have cumulative % ≤ 80% (vital few) | Low priority items exceed 80% threshold (trivial many)
                            </p>
                        </CardFooter>
                    </Card>
                </div>
            )}
            
            {!isLoading && !results && (
                <div className="text-center text-muted-foreground py-10">
                    <BarChart className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Configure parameters and click &apos;Run Analysis&apos; to generate Pareto chart.</p>
                </div>
            )}
        </div>
    );
}
