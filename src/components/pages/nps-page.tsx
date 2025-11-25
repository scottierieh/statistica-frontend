'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Smile, Frown, Meh, Percent, HelpCircle, Settings, FileSearch, TrendingUp, Bot, Download, Activity, Info, BarChart3, Target } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { CheckCircle } from 'lucide-react';
import { BookOpen } from 'lucide-react';
import Papa from 'papaparse';
import { Progress } from '../ui/progress';

interface NpsResult {
    npsScore: number;
    promoters: number;
    passives: number;
    detractors: number;
    total: number;
    interpretation: string;
}

interface FullAnalysisResponse {
    results: NpsResult;
    interpretations?: {
        overall_analysis: string;
        segment_insights: string[];
        recommendations: string;
    };
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: NpsResult }) => {
    const promoterRate = (results.promoters / results.total) * 100;
    const detractorRate = (results.detractors / results.total) * 100;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* NPS Score Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                NPS Score
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${results.npsScore >= 50 ? 'text-green-600' : results.npsScore >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {results.npsScore.toFixed(1)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.npsScore >= 50 ? 'Excellent' : results.npsScore >= 30 ? 'Great' : results.npsScore >= 0 ? 'Good' : 'Needs improvement'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Total Responses Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Total Responses
                            </p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.total.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Customer ratings
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Promoter Rate Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Promoter Rate
                            </p>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                        <p className="text-2xl font-semibold text-green-600">
                            {promoterRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.promoters} customers
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Detractor Rate Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Detractor Rate
                            </p>
                            <BarChart3 className="h-4 w-4 text-red-600" />
                        </div>
                        <p className="text-2xl font-semibold text-red-600">
                            {detractorRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.detractors} customers
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const NpsOverview = ({ scoreColumn, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        if (!scoreColumn) {
            overview.push('⚠ Select a score column to analyze');
        } else {
            overview.push(`Score column: ${scoreColumn}`);
        }

        overview.push(`${data.length} customer responses`);
        overview.push('Metric: Net Promoter Score (NPS)');
        overview.push('Scale: 0-10 rating');
        overview.push('Formula: % Promoters - % Detractors');
        overview.push('Segments: Promoters (9-10), Passives (7-8), Detractors (0-6)');
        overview.push('Best for: Customer loyalty measurement');

        return overview;
    }, [scoreColumn, data]);

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

// Generate interpretations based on NPS results
const generateNpsInterpretations = (results: NpsResult) => {
    const insights: string[] = [];
    
    const promoterRate = (results.promoters / results.total) * 100;
    const passiveRate = (results.passives / results.total) * 100;
    const detractorRate = (results.detractors / results.total) * 100;
    
    // Overall analysis
    let overall = '';
    if (results.npsScore >= 70) {
        overall = `<strong>World-class customer loyalty.</strong> Your NPS score of ${results.npsScore.toFixed(1)} is exceptional, placing you among industry leaders. With ${promoterRate.toFixed(1)}% promoters and only ${detractorRate.toFixed(1)}% detractors, you have a strong base of loyal advocates who actively promote your brand.`;
    } else if (results.npsScore >= 50) {
        overall = `<strong>Excellent customer loyalty.</strong> Your NPS score of ${results.npsScore.toFixed(1)} indicates strong customer satisfaction and loyalty. ${promoterRate.toFixed(1)}% of customers are promoters, significantly outweighing the ${detractorRate.toFixed(1)}% detractors. This is a solid foundation for sustainable growth.`;
    } else if (results.npsScore >= 30) {
        overall = `<strong>Good customer loyalty with room for improvement.</strong> Your NPS score of ${results.npsScore.toFixed(1)} is positive and above average. With ${promoterRate.toFixed(1)}% promoters versus ${detractorRate.toFixed(1)}% detractors, you have more advocates than critics, but there's opportunity to convert passives and reduce detractors.`;
    } else if (results.npsScore >= 0) {
        overall = `<strong>Fair customer loyalty - improvement needed.</strong> Your NPS score of ${results.npsScore.toFixed(1)} is positive but modest. Promoters (${promoterRate.toFixed(1)}%) only slightly outnumber detractors (${detractorRate.toFixed(1)}%), indicating mixed customer sentiment. Focus on understanding and addressing detractor concerns while converting passives to promoters.`;
    } else {
        overall = `<strong>Critical customer loyalty issues detected.</strong> Your NPS score of ${results.npsScore.toFixed(1)} is negative, with detractors (${detractorRate.toFixed(1)}%) outnumbering promoters (${promoterRate.toFixed(1)}%). This indicates significant dissatisfaction that requires immediate attention to prevent churn and negative word-of-mouth.`;
    }
    
    // Promoter insights
    insights.push(`<strong>Promoters (9-10):</strong> ${results.promoters} customers (${promoterRate.toFixed(1)}%) are highly satisfied promoters. These loyal advocates will continue purchasing and refer others, driving organic growth. ${promoterRate > 50 ? 'Your strong promoter base is a competitive advantage.' : promoterRate > 30 ? 'Good promoter numbers, but opportunity to expand this segment.' : 'Limited promoter base - prioritize converting passives and addressing pain points.'}`);
    
    // Passive insights
    insights.push(`<strong>Passives (7-8):</strong> ${results.passives} customers (${passiveRate.toFixed(1)}%) are passives. While satisfied, they lack enthusiasm and are vulnerable to competitors. ${passiveRate > 40 ? 'High passive segment presents significant conversion opportunity.' : 'Moderate passive segment - focus on delighting them to create promoters.'} Small improvements could move them to promoter status.`);
    
    // Detractor insights
    insights.push(`<strong>Detractors (0-6):</strong> ${results.detractors} customers (${detractorRate.toFixed(1)}%) are unhappy detractors who may damage your brand through negative reviews and churn. ${detractorRate > 30 ? 'High detractor rate is concerning and requires urgent action.' : detractorRate > 15 ? 'Moderate detractor levels need attention to prevent escalation.' : 'Low detractor rate is positive, but each unhappy customer still matters.'}`);
    
    // Distribution analysis
    const ratio = promoterRate > 0 ? detractorRate / promoterRate : 0;
    insights.push(`<strong>Sentiment Balance:</strong> Promoter-to-detractor ratio is ${(promoterRate / Math.max(detractorRate, 0.1)).toFixed(2)}:1. ${ratio < 0.3 ? 'Excellent balance with promoters strongly dominating.' : ratio < 0.6 ? 'Good balance favoring promoters.' : ratio < 1 ? 'Close balance - more work needed to distance from detractors.' : 'Unfavorable balance - detractors too prominent.'}`);
    
    // Industry context
    let industryContext = '';
    if (results.npsScore >= 50) {
        industryContext = 'Your score exceeds most industry benchmarks, putting you in the top tier of companies.';
    } else if (results.npsScore >= 30) {
        industryContext = 'Your score is above average for most industries.';
    } else if (results.npsScore >= 0) {
        industryContext = 'Your score is around industry average. Many successful companies operate in this range, but there\'s clear room for improvement.';
    } else {
        industryContext = 'Your score is below typical industry standards, indicating systemic issues that need addressing.';
    }
    insights.push(`<strong>Industry Context:</strong> ${industryContext} NPS varies by sector - retail typically ranges 30-40, SaaS 30-50, and premium services can exceed 70.`);
    
    // Recommendations
    let recommendations = '';
    if (results.npsScore < 0) {
        recommendations = 'URGENT ACTION REQUIRED. Your negative NPS demands immediate intervention: (1) Conduct crisis analysis to identify root causes of dissatisfaction, (2) Reach out personally to detractors to understand and address their concerns, (3) Implement rapid fixes for the most common pain points, (4) Review product/service quality, customer support, and delivery processes, (5) Create a 90-day turnaround plan with weekly NPS monitoring, (6) Consider appointing a dedicated customer experience team, (7) Analyze if recent changes triggered the decline. A negative NPS threatens business viability.';
    } else if (detractorRate > 30) {
        recommendations = 'High detractor rate requires focused remediation: (1) Segment detractors to identify common issues, (2) Launch a detractor recovery program with personal follow-ups, (3) Close the feedback loop - show customers you\'re acting on their concerns, (4) Fix the top 3 pain points identified by detractors, (5) Train staff on handling unhappy customers, (6) Monitor detractor trends weekly to catch emerging issues early, (7) Create win-back campaigns for at-risk customers. Reducing detractors has 2x the NPS impact of gaining promoters.';
    } else if (passiveRate > 40) {
        recommendations = 'Large passive segment presents conversion opportunity: (1) Survey passives to understand what would make them promoters, (2) Identify the "gap" between satisfaction and advocacy, (3) Enhance customer experience at key touchpoints, (4) Add "wow" factors that exceed expectations, (5) Build community and emotional connection with your brand, (6) Implement loyalty programs to increase engagement, (7) Proactively solve problems before customers notice them. Converting passives is the fastest path to NPS growth.';
    } else if (results.npsScore >= 50) {
        recommendations = 'Excellent NPS - focus on maintaining and leveraging: (1) Systematize whatever is driving your success, (2) Capture and share customer success stories, (3) Create formal referral programs to capitalize on promoters, (4) Monitor NPS continuously to catch any degradation early, (5) Expand into new segments while maintaining quality, (6) Benchmark against industry leaders to identify improvement areas, (7) Train new employees on the practices that built this score. Protect your competitive advantage by institutionalizing customer-centricity.';
    } else {
        recommendations = 'Build on your positive foundation: (1) Establish a regular NPS measurement cadence (monthly or quarterly), (2) Close the loop with all respondents, especially detractors and passives, (3) Connect NPS to operational metrics to understand drivers, (4) Empower frontline staff to resolve issues immediately, (5) Create a customer advisory board to co-create improvements, (6) Set segment-specific goals (reduce detractors by X%, increase promoters by Y%), (7) Celebrate and share customer wins internally. Continuous improvement and customer obsession will drive your score upward.';
    }
    
    return {
        overall_analysis: overall,
        segment_insights: insights,
        recommendations: recommendations
    };
};

// Enhanced Intro Page
const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const npsExample = exampleDatasets.find(ex => ex.id === 'csat-data');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <TrendingUp className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Net Promoter Score (NPS)</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Measure customer loyalty and predict business growth
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Smile className="w-6 h-6 text-green-600 mb-2" />
                                <CardTitle className="text-lg">Promoters</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Scores 9-10: Loyal advocates
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Meh className="w-6 h-6 text-yellow-600 mb-2" />
                                <CardTitle className="text-lg">Passives</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Scores 7-8: Satisfied but neutral
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Frown className="w-6 h-6 text-red-600 mb-2" />
                                <CardTitle className="text-lg">Detractors</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Scores 0-6: Unhappy critics
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Net Promoter Score
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            NPS is the gold standard for measuring customer loyalty and satisfaction. Based on one simple 
                            question - "How likely are you to recommend us to a friend or colleague?" (0-10 scale) - it 
                            categorizes customers into three segments and calculates a score from -100 to +100. Scores above 
                            0 are good, above 50 are excellent, and above 70 are world-class. Use NPS to track loyalty over 
                            time, benchmark against competitors, and identify improvement opportunities.
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
                                        <span><strong>Score Column:</strong> 0-10 ratings from customers</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Min Responses:</strong> 30+ for reliability</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Question:</strong> "How likely to recommend?"</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Regular tracking:</strong> Monitor trends over time</span>
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
                                        <span><strong>Score:</strong> % Promoters - % Detractors</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Range:</strong> -100 (all detractors) to +100</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Benchmark:</strong> >0 good, >50 excellent</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Action:</strong> Focus on reducing detractors</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {npsExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(npsExample)} size="lg">
                                <TrendingUp className="mr-2 h-5 w-5" />
                                Load NPS Example
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface NpsPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport?: (stats: any, viz: string | null) => void;
}

export default function NpsPage({ data, numericHeaders, onLoadExample, onGenerateReport }: NpsPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [scoreColumn, setScoreColumn] = useState<string | undefined>();
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

    useEffect(() => {
        const npsCol = numericHeaders.find(h => h.toLowerCase().includes('nps') || h.toLowerCase().includes('rating') || h.toLowerCase().includes('score'));
        setScoreColumn(npsCol || numericHeaders[0]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!scoreColumn) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a score column.' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const scores = data.map(row => row[scoreColumn]).filter(v => typeof v === 'number' && !isNaN(v));
            if (scores.length === 0) {
                throw new Error("No valid numeric data found in the selected column.");
            }

            const response = await fetch('/api/analysis/nps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scores })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'An unknown error occurred');
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            
            // Generate interpretations
            const interpretations = generateNpsInterpretations(result.results);
            result.interpretations = interpretations;
            
            setAnalysisResult(result);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, scoreColumn, toast]);

    const handleDownloadResults = useCallback(() => {
        if (!analysisResult) {
            toast({ title: "No Data to Download", description: "Analysis results are not available." });
            return;
        }
        
        const results = analysisResult.results;
        const exportData = [{
            nps_score: results.npsScore,
            total_responses: results.total,
            promoters: results.promoters,
            promoters_percentage: ((results.promoters / results.total) * 100).toFixed(2),
            passives: results.passives,
            passives_percentage: ((results.passives / results.total) * 100).toFixed(2),
            detractors: results.detractors,
            detractors_percentage: ((results.detractors / results.total) * 100).toFixed(2)
        }];
        
        const csv = Papa.unparse(exportData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'nps_analysis_results.csv';
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Download Started", description: "NPS results are being downloaded." });
    }, [analysisResult, toast]);
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const results = analysisResult?.results;
    
    const chartData = results ? [
        { name: 'Promoters', value: results.promoters, fill: '#16a34a', percentage: ((results.promoters / results.total) * 100).toFixed(1) },
        { name: 'Passives', value: results.passives, fill: '#facc15', percentage: ((results.passives / results.total) * 100).toFixed(1) },
        { name: 'Detractors', value: results.detractors, fill: '#ef4444', percentage: ((results.detractors / results.total) * 100).toFixed(1) }
    ] : [];

    const barChartData = results ? [
        { name: 'Promoters', count: results.promoters, fill: '#16a34a' },
        { name: 'Passives', count: results.passives, fill: '#facc15' },
        { name: 'Detractors', count: results.detractors, fill: '#ef4444' }
    ] : [];

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">NPS Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}>
                            <HelpCircle className="w-5 h-5"/>
                        </Button>
                    </div>
                    <CardDescription>Select the column containing 0-10 customer ratings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="max-w-xs">
                        <Label>NPS Score Column (0-10)</Label>
                        <Select value={scoreColumn} onValueChange={setScoreColumn}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    
                    {/* Analysis Overview */}
                    <NpsOverview scoreColumn={scoreColumn} data={data} />
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
                    <Button onClick={handleAnalysis} disabled={isLoading || !scoreColumn}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Calculating...</> : <><Sigma className="mr-2"/>Calculate NPS</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6 flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-muted-foreground">Calculating Net Promoter Score...</p>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            )}

            {analysisResult && results && (
                <div className="space-y-6">
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={results} />

                    {/* Large NPS Score Display */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline text-center">Your Net Promoter Score</CardTitle>
                            <CardDescription className="text-center">
                                Based on {results.total} customer responses
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <div className={`text-8xl font-bold ${results.npsScore >= 50 ? 'text-green-600' : results.npsScore >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                                {results.npsScore.toFixed(1)}
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <div className="text-sm text-muted-foreground">
                                    Score Range: -100 to +100
                                </div>
                            </div>
                            <Progress 
                                value={((results.npsScore + 100) / 200) * 100} 
                                className="h-3"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>-100</span>
                                <span>0</span>
                                <span>+100</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Interpretation */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        <div className="lg:col-span-3">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Interpretation</CardTitle>
                                    <CardDescription>Analysis of your customer loyalty metrics.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 text-sm">
                                    <Alert>
                                        <Percent className="h-4 w-4" />
                                        <AlertTitle>Customer Sentiment</AlertTitle>
                                        <AlertDescription dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                    </Alert>
                                    <div className="mt-4">
                                        <strong className="text-foreground">Overall Analysis:</strong>
                                        <p className="text-muted-foreground mt-1" dangerouslySetInnerHTML={{ __html: analysisResult.interpretations?.overall_analysis || '' }} />
                                    </div>
                                    <div>
                                        <strong className="text-foreground">Recommendations:</strong>
                                        <p className="text-muted-foreground mt-1">
                                            {analysisResult.interpretations?.recommendations}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Segment Insights */}
                    {analysisResult.interpretations?.segment_insights && analysisResult.interpretations.segment_insights.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Segment Insights</CardTitle>
                                <CardDescription>Detailed breakdown of each customer segment.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {analysisResult.interpretations.segment_insights.map((insight, index) => (
                                        <Alert key={index} variant="default">
                                            <Info className="h-4 w-4" />
                                            <AlertDescription dangerouslySetInnerHTML={{ __html: insight }} />
                                        </Alert>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Segment Cards */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-green-300 border-2">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Promoters (9-10)</CardTitle>
                                <Smile className="text-green-500 h-5 w-5"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-green-600">{results.promoters}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {((results.promoters / results.total) * 100).toFixed(1)}% of total responses
                                </p>
                                <Progress 
                                    value={(results.promoters / results.total) * 100} 
                                    className="mt-2 h-2"
                                />
                            </CardContent>
                        </Card>
                        
                        <Card className="border-yellow-300 border-2">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Passives (7-8)</CardTitle>
                                <Meh className="text-yellow-500 h-5 w-5"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-yellow-600">{results.passives}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {((results.passives / results.total) * 100).toFixed(1)}% of total responses
                                </p>
                                <Progress 
                                    value={(results.passives / results.total) * 100} 
                                    className="mt-2 h-2"
                                />
                            </CardContent>
                        </Card>
                        
                        <Card className="border-red-300 border-2">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Detractors (0-6)</CardTitle>
                                <Frown className="text-red-500 h-5 w-5"/>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-red-600">{results.detractors}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {((results.detractors / results.total) * 100).toFixed(1)}% of total responses
                                </p>
                                <Progress 
                                    value={(results.detractors / results.total) * 100} 
                                    className="mt-2 h-2"
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Visualizations */}
                    <div className="grid md:grid-cols-2 gap-4">
                        {/* Pie Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Distribution Overview</CardTitle>
                                <CardDescription>Proportion of each customer segment</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={{}} className="w-full h-64">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={chartData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percentage }) => `${name}: ${percentage}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<ChartTooltipContent />} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </CardContent>
                        </Card>

                        {/* Bar Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Segment Comparison</CardTitle>
                                <CardDescription>Customer count by segment</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={{}} className="w-full h-64">
                                    <ResponsiveContainer>
                                        <BarChart data={barChartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                                {barChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <TrendingUp className="mx-auto h-12 w-12 text-gray-400"/>
                    <p className="mt-2">Select a score column and click &apos;Calculate NPS&apos; to analyze customer loyalty.</p>
                </div>
            )}
        </div>
    );
}