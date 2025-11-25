'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, HeartPulse, FileText, CheckCircle, AlertTriangle, TrendingUp, Clock, BarChart3, Info, Activity, HelpCircle, Target, Percent, Users, Lightbulb, BookOpen } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsTrigger, TabsList, TabsContent } from '../ui/tabs';
import { Badge } from '../ui/badge';

interface SurvivalAnalysisPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

// Overview Component matching other analysis pages
const SurvivalOverview = ({ durationCol, eventCol, groupCol, covariates, dataLength }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        if (durationCol && eventCol) {
            overview.push(`Analyzing survival time: ${durationCol}`);
            overview.push(`Event indicator: ${eventCol}`);
            
            if (groupCol) {
                overview.push(`Comparing groups by: ${groupCol}`);
            }
            
            if (covariates.length > 0) {
                overview.push(`Covariates: ${covariates.join(', ')}`);
            }
        } else {
            overview.push('Select duration and event columns');
        }

        // Sample size
        if (dataLength < 30) {
            overview.push(`Sample size: ${dataLength} (⚠ Small - results may be unstable)`);
        } else if (dataLength < 100) {
            overview.push(`Sample size: ${dataLength} (Moderate)`);
        } else {
            overview.push(`Sample size: ${dataLength} (Good)`);
        }
        
        // Analysis methods
        overview.push('Primary method: Kaplan-Meier survival curves');
        
        if (groupCol) {
            overview.push('Group comparison: Log-rank test');
        }
        
        if (covariates.length > 0) {
            overview.push('Regression models: Cox PH and AFT models');
        }
        
        overview.push('Output: Survival curves, median survival time, hazard ratios');

        return overview;
    }, [durationCol, eventCol, groupCol, covariates, dataLength]);

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

// Intro Page
const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const survivalExample = exampleDatasets.find(ex => ex.id === 'survival-churn');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Clock className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Survival Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Analyze time-to-event data with Kaplan-Meier curves, Cox regression, and AFT models
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <HeartPulse className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Kaplan-Meier</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Non-parametric survival curves and median survival time estimation
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Cox Regression</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Proportional hazards model for covariate effects on survival
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Sigma className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">AFT Models</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Accelerated failure time models with Weibull and log-normal distributions
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Required Data Structure
                        </h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span><strong>Duration column:</strong> Time to event (numeric)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span><strong>Event column:</strong> Event status (0/1 or True/False)</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span><strong>Group column (optional):</strong> Categorical variable for group comparison</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span><strong>Covariates (optional):</strong> Additional variables for Cox/AFT regression</span>
                            </li>
                        </ul>
                    </div>

                    {survivalExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(survivalExample)} size="lg">
                                <HeartPulse className="mr-2" />
                                Load Sample Churn Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default function SurvivalAnalysisPage({ data, numericHeaders, categoricalHeaders, allHeaders, onLoadExample }: SurvivalAnalysisPageProps) {
    const { toast } = useToast();
    const [showIntro, setShowIntro] = useState(data.length === 0);
    const [durationCol, setDurationCol] = useState<string | undefined>();
    const [eventCol, setEventCol] = useState<string | undefined>();
    const [groupCol, setGroupCol] = useState<string | undefined>();
    const [covariates, setCovariates] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1 && allHeaders.length > 1, [data, numericHeaders, allHeaders]);
    
    const availableCovariates = useMemo(() => {
        const excluded = new Set([durationCol, eventCol, groupCol]);
        return allHeaders.filter(h => !excluded.has(h));
    }, [allHeaders, durationCol, eventCol, groupCol]);

    useEffect(() => {
        if (data.length === 0) {
            setShowIntro(true);
        } else if (canRun) {
            setDurationCol(numericHeaders.find(h => h.toLowerCase().includes('tenure') || h.toLowerCase().includes('time')));
            setEventCol(allHeaders.find(h => h.toLowerCase().includes('churn') || h.toLowerCase().includes('event')));
            setGroupCol(categoricalHeaders[0]);
            setCovariates([]);
            setAnalysisResult(null);
            setShowIntro(false);
        }
    }, [data, numericHeaders, categoricalHeaders, allHeaders, canRun]);

    const handleCovariateChange = (header: string, checked: boolean) => {
        setCovariates(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async (modelType: string = 'all') => {
        if (!durationCol || !eventCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both duration and event columns.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/survival', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, durationCol, eventCol, groupCol, covariates, modelType })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Survival Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, durationCol, eventCol, groupCol, covariates, toast]);
    
    if (showIntro || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;
    const dataSummary = results?.data_summary;
    const hasSignificantLogRank = results?.log_rank_test?.is_significant;
    
    // Parse interpretation into sections
    const parseInterpretation = (interpretation: string) => {
        const sections: { title: string; content: string[]; icon: any }[] = [];
        if (!interpretation) return sections;
        
        const lines = interpretation.split('\n').filter(l => l.trim());
        let currentSection: typeof sections[0] | null = null;

        lines.forEach((line) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                const title = trimmed.replace(/\*\*/g, '').trim();
                let icon = Users;
                if (title.toLowerCase().includes('overall')) icon = Users;
                else if (title.toLowerCase().includes('statistical') || title.toLowerCase().includes('insights')) icon = Lightbulb;
                else if (title.toLowerCase().includes('recommend')) icon = BookOpen;
                
                currentSection = { title, content: [], icon };
                sections.push(currentSection);
            } else if (currentSection && trimmed) {
                currentSection.content.push(trimmed);
            }
        });

        return sections;
    };

    const interpretationSections = results?.interpretation ? parseInterpretation(results.interpretation) : [];
    
    return (
        <div className="space-y-6">
            {/* Analysis Setup Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="font-headline">Survival Analysis Setup</CardTitle>
                            <CardDescription>Configure the variables for survival analysis</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => setShowIntro(true)}>
                            <HelpCircle className="h-5 w-5" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <Label>Duration Column</Label>
                            <Select value={durationCol} onValueChange={setDurationCol}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                                <SelectContent>
                                    {numericHeaders.map(h => (
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Event Column</Label>
                            <Select value={eventCol} onValueChange={setEventCol}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select event" />
                                </SelectTrigger>
                                <SelectContent>
                                    {allHeaders.map(h => (
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Group Column (Optional)</Label>
                            <Select value={groupCol} onValueChange={v => setGroupCol(v === 'none' ? undefined : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {categoricalHeaders.map(h => (
                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Covariates (Cox/AFT)</Label>
                            <ScrollArea className="h-24 border rounded-md p-2">
                                {availableCovariates.length > 0 ? (
                                    availableCovariates.map(h => (
                                        <div key={h} className="flex items-center space-x-2 mb-1">
                                            <Checkbox 
                                                id={`cov-${h}`} 
                                                checked={covariates.includes(h)} 
                                                onCheckedChange={(c) => handleCovariateChange(h, c as boolean)} 
                                            />
                                            <Label htmlFor={`cov-${h}`} className="text-sm font-normal cursor-pointer">{h}</Label>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No covariates available</p>
                                )}
                            </ScrollArea>
                        </div>
                    </div>

                    {/* Overview Component */}
                    {durationCol && eventCol && (
                        <SurvivalOverview 
                            durationCol={durationCol}
                            eventCol={eventCol}
                            groupCol={groupCol}
                            covariates={covariates}
                            dataLength={data.length}
                        />
                    )}
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={() => handleAnalysis('all')} disabled={isLoading || !durationCol || !eventCol} size="lg">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Running Analysis...
                            </>
                        ) : (
                            <>
                                <Sigma className="mr-2 h-4 w-4" />
                                Run Survival Analysis
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
                <>
                    {/* Statistical Summary Cards */}
                    {dataSummary && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="p-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-muted-foreground">
                                                Total Subjects
                                            </p>
                                            <Activity className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <p className="text-2xl font-semibold">
                                            {dataSummary.total_subjects}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Observations
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-muted-foreground">
                                                Events
                                            </p>
                                            <Target className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <p className="text-2xl font-semibold">
                                            {dataSummary.total_events}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {(dataSummary.event_rate * 100).toFixed(1)}% rate
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-muted-foreground">
                                                Censored
                                            </p>
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <p className="text-2xl font-semibold">
                                            {dataSummary.censored}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {(dataSummary.censoring_rate * 100).toFixed(1)}% rate
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-muted-foreground">
                                                Mean Duration
                                            </p>
                                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <p className="text-2xl font-semibold">
                                            {dataSummary.mean_duration?.toFixed(2)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            SD: {dataSummary.std_duration?.toFixed(2)}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* Detailed Analysis Section - NEW */}
                    {interpretationSections.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Detailed Analysis</CardTitle>
                                <CardDescription>Comprehensive interpretation of survival analysis results in APA format</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4">
                                    {interpretationSections.map((section, idx) => {
                                        const IconComponent = section.icon;
                                        const colorClasses = idx === 0 
                                            ? 'bg-gradient-to-r from-primary/5 to-primary/10 border-primary/40'
                                            : idx === 1
                                            ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-300 dark:border-blue-700'
                                            : 'bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 border-amber-300 dark:border-amber-700';
                                        
                                        const iconBgClasses = idx === 0
                                            ? 'bg-primary/20 text-primary'
                                            : idx === 1
                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
                                        
                                        const bulletColor = idx === 0
                                            ? 'text-primary'
                                            : idx === 1
                                            ? 'text-blue-600 dark:text-blue-400'
                                            : 'text-amber-600 dark:text-amber-400';

                                        return (
                                            <div 
                                                key={idx} 
                                                className={`rounded-xl border-2 p-5 ${colorClasses}`}
                                            >
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className={`p-2 rounded-lg ${iconBgClasses}`}>
                                                        <IconComponent className="h-5 w-5" />
                                                    </div>
                                                    <h3 className="font-semibold text-base">{section.title}</h3>
                                                </div>
                                                <div className="space-y-2.5 text-sm">
                                                    {section.content.map((line, lineIdx) => {
                                                        const isArrow = line.startsWith('→');
                                                        const isBullet = line.startsWith('•');
                                                        const content = line.replace(/^[→•]\s*/, '');
                                                        
                                                        return (
                                                            <div 
                                                                key={lineIdx} 
                                                                className={`flex items-start gap-2 ${isBullet ? 'ml-4' : ''}`}
                                                            >
                                                                <span className={`${bulletColor} flex-shrink-0 mt-0.5`}>
                                                                    {isArrow ? '→' : isBullet ? '•' : '→'}
                                                                </span>
                                                                <span 
                                                                    className="text-muted-foreground leading-relaxed"
                                                                    dangerouslySetInnerHTML={{ 
                                                                        __html: content
                                                                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>')
                                                                    }}
                                                                />
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Visualization Card */}
                    {analysisResult.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Survival Curves</CardTitle>
                                <CardDescription>Kaplan-Meier survival curves, hazard functions, and risk stratification</CardDescription>
                            </CardHeader>
                            <CardContent className="flex justify-center">
                                <Image 
                                    src={analysisResult.plot} 
                                    alt="Survival Analysis Plots" 
                                    width={1600} 
                                    height={1200} 
                                    className="w-3/4 rounded-md border" 
                                />
                            </CardContent>
                        </Card>
                    )}

                    {/* Group Statistics Table */}
                    {dataSummary?.group_summaries && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Group Statistics</CardTitle>
                                <CardDescription>Detailed breakdown by group</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Group</TableHead>
                                            <TableHead className="text-right">N</TableHead>
                                            <TableHead className="text-right">Events</TableHead>
                                            <TableHead className="text-right">Censored</TableHead>
                                            <TableHead className="text-right">Event Rate</TableHead>
                                            <TableHead className="text-right">Mean Duration</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(dataSummary.group_summaries).map(([group, summary]: [string, any]) => (
                                            <TableRow key={group}>
                                                <TableCell className="font-medium">{group}</TableCell>
                                                <TableCell className="text-right font-mono">{summary.n_subjects}</TableCell>
                                                <TableCell className="text-right font-mono">{summary.n_events}</TableCell>
                                                <TableCell className="text-right font-mono">{summary.n_censored}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant="outline">
                                                        {(summary.event_rate * 100).toFixed(1)}%
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right font-mono">{summary.mean_duration?.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Detailed Results Tabs */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Detailed Statistical Results</CardTitle>
                            <CardDescription>Comprehensive analysis output for each model</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="kaplan_meier" className="w-full">
                                <TabsList className="grid w-full grid-cols-5">
                                    <TabsTrigger value="kaplan_meier">Kaplan-Meier</TabsTrigger>
                                    <TabsTrigger value="group_tests" disabled={!results.log_rank_test}>Group Tests</TabsTrigger>
                                    <TabsTrigger value="cox_ph" disabled={!results.cox_ph}>Cox PH</TabsTrigger>
                                    <TabsTrigger value="aft_weibull" disabled={!results.aft_weibull}>Weibull AFT</TabsTrigger>
                                    <TabsTrigger value="aft_lognormal" disabled={!results.aft_lognormal}>Log-Normal AFT</TabsTrigger>
                                </TabsList>

                                {/* Kaplan-Meier Tab */}
                                <TabsContent value="kaplan_meier" className="space-y-4 mt-4">
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertTitle>Kaplan-Meier Method</AlertTitle>
                                        <AlertDescription>
                                            Non-parametric method to estimate survival probability over time. Shows median survival time, 
                                            confidence intervals, and restricted mean survival time (RMST).
                                        </AlertDescription>
                                    </Alert>

                                    {results.kaplan_meier_grouped && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Group Comparisons</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Group</TableHead>
                                                            <TableHead className="text-right">Median Survival</TableHead>
                                                            <TableHead className="text-right">RMST</TableHead>
                                                            <TableHead className="text-right">Events</TableHead>
                                                            <TableHead className="text-right">N</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {Object.entries(results.kaplan_meier_grouped).map(([group, data]: [string, any]) => (
                                                            <TableRow key={group}>
                                                                <TableCell className="font-medium">{group}</TableCell>
                                                                <TableCell className="text-right font-mono">{data.median_survival?.toFixed(2) ?? 'N/A'}</TableCell>
                                                                <TableCell className="text-right font-mono">{data.rmst?.toFixed(2) ?? 'N/A'}</TableCell>
                                                                <TableCell className="text-right font-mono">{data.n_events}</TableCell>
                                                                <TableCell className="text-right font-mono">{data.n_subjects}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {results.kaplan_meier.survival_at_times && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Survival at Time Points</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="grid grid-cols-3 gap-4">
                                                    {Object.entries(results.kaplan_meier.survival_at_times).map(([key, value]: [string, any]) => (
                                                        <div key={key} className="text-center p-4 border rounded-lg">
                                                            <p className="text-sm text-muted-foreground mb-1">{key.replace('_', ' ')}</p>
                                                            <p className="text-2xl font-bold">
                                                                {value ? `${(value * 100).toFixed(1)}%` : 'N/A'}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}
                                </TabsContent>

                                {/* Group Tests Tab */}
                                <TabsContent value="group_tests" className="space-y-4 mt-4">
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertTitle>Group Comparison Tests</AlertTitle>
                                        <AlertDescription>
                                            Log-rank test compares survival curves between groups. Tests whether observed differences 
                                            are statistically significant. Pairwise tests show specific group differences.
                                        </AlertDescription>
                                    </Alert>

                                    {results.log_rank_test && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Multivariate Log-Rank Test</CardTitle>
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
                                                            <TableCell className="font-medium">Test Statistic (χ²)</TableCell>
                                                            <TableCell className="text-right font-mono">{results.log_rank_test.test_statistic.toFixed(4)}</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell className="font-medium">Degrees of Freedom</TableCell>
                                                            <TableCell className="text-right font-mono">{results.log_rank_test.degrees_of_freedom}</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell className="font-medium">p-value</TableCell>
                                                            <TableCell className="text-right font-mono">{results.log_rank_test.p_value.toFixed(4)}</TableCell>
                                                        </TableRow>
                                                        <TableRow>
                                                            <TableCell className="font-medium">Significance</TableCell>
                                                            <TableCell className="text-right">
                                                                <Badge variant={results.log_rank_test.is_significant ? 'default' : 'secondary'}>
                                                                    {results.log_rank_test.is_significant ? 'Significant' : 'Not Significant'}
                                                                </Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {results.pairwise_log_rank_test && !results.pairwise_log_rank_test.error && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Pairwise Comparisons</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            {Object.keys(results.pairwise_log_rank_test[0] || {}).map(key => (
                                                                <TableHead key={key}>{key}</TableHead>
                                                            ))}
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {results.pairwise_log_rank_test.map((row: any, i: number) => (
                                                            <TableRow key={i}>
                                                                {Object.entries(row).map(([key, val]: [string, any], j: number) => (
                                                                    <TableCell key={j}>
                                                                        {key === 'p' && typeof val === 'number' ? (
                                                                            <Badge variant={val < 0.05 ? 'default' : 'outline'}>
                                                                                {val < 0.001 ? '<.001' : val.toFixed(4)}
                                                                            </Badge>
                                                                        ) : typeof val === 'number' ? (
                                                                            val.toFixed(4)
                                                                        ) : (
                                                                            val?.toString()
                                                                        )}
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </CardContent>
                                        </Card>
                                    )}
                                </TabsContent>

                                {/* Cox PH Tab */}
                                <TabsContent value="cox_ph" className="space-y-4 mt-4">
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertTitle>Cox Proportional Hazards Model</AlertTitle>
                                        <AlertDescription>
                                            Semi-parametric regression model for survival data. Hazard ratios (HR) &gt; 1 indicate increased risk, 
                                            HR &lt; 1 indicates decreased risk. Concordance index (C-index) measures predictive accuracy.
                                        </AlertDescription>
                                    </Alert>

                                    {results.cox_ph && results.cox_ph.summary && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Cox Regression Coefficients</CardTitle>
                                                <CardDescription>
                                                    C-index: <Badge variant="secondary">{results.cox_ph.concordance?.toFixed(4)}</Badge>
                                                    {results.cox_ph.aic && (
                                                        <span className="ml-2">
                                                            AIC: <Badge variant="outline">{results.cox_ph.aic.toFixed(2)}</Badge>
                                                        </span>
                                                    )}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Covariate</TableHead>
                                                            <TableHead className="text-right">Coefficient</TableHead>
                                                            <TableHead className="text-right">Hazard Ratio</TableHead>
                                                            <TableHead className="text-right">95% CI</TableHead>
                                                            <TableHead className="text-right">p-value</TableHead>
                                                            <TableHead className="text-center">Significance</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {results.cox_ph.summary.map((row: any, i: number) => {
                                                            const isSignificant = row.p < 0.05;
                                                            return (
                                                                <TableRow key={i}>
                                                                    <TableCell className="font-medium">{row.covariate || row.index}</TableCell>
                                                                    <TableCell className="text-right font-mono">{row.coef?.toFixed(3)}</TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Badge variant={row['exp(coef)'] > 1 ? 'destructive' : 'default'}>
                                                                            {row['exp(coef)']?.toFixed(3)}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-xs font-mono">
                                                                        [{row['exp(coef) lower 95%']?.toFixed(3)}, {row['exp(coef) upper 95%']?.toFixed(3)}]
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Badge variant={row.p < 0.05 ? 'default' : 'outline'}>
                                                                            {row.p < 0.001 ? '<.001' : row.p?.toFixed(4)}
                                                                        </Badge>
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

                                                {results.cox_ph.proportional_hazard_assumption && (
                                                    <Alert variant={results.cox_ph.proportional_hazard_assumption.passed ? 'default' : 'destructive'} className="mt-4">
                                                        <AlertTitle>Proportional Hazards Assumption</AlertTitle>
                                                        <AlertDescription>
                                                            {results.cox_ph.proportional_hazard_assumption.passed 
                                                                ? 'The proportional hazards assumption is satisfied.' 
                                                                : 'The proportional hazards assumption may be violated.'}
                                                        </AlertDescription>
                                                    </Alert>
                                                )}
                                            </CardContent>
                                        </Card>
                                    )}
                                </TabsContent>

                                {/* Weibull AFT Tab */}
                                <TabsContent value="aft_weibull" className="space-y-4 mt-4">
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertTitle>Weibull AFT Model</AlertTitle>
                                        <AlertDescription>
                                            Accelerated Failure Time model assuming Weibull distribution. Positive coefficients indicate 
                                            slower time to event (protective), negative coefficients indicate faster time to event (risk factor).
                                        </AlertDescription>
                                    </Alert>

                                    {results.aft_weibull && results.aft_weibull.summary && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Weibull AFT Coefficients</CardTitle>
                                                <CardDescription>
                                                    {results.aft_weibull.aic && (
                                                        <span>AIC: <Badge variant="outline">{results.aft_weibull.aic.toFixed(2)}</Badge></span>
                                                    )}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Covariate</TableHead>
                                                            <TableHead className="text-right">Coefficient</TableHead>
                                                            <TableHead className="text-right">exp(coef)</TableHead>
                                                            <TableHead className="text-right">p-value</TableHead>
                                                            <TableHead className="text-center">Significance</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {results.aft_weibull.summary.map((row: any, i: number) => {
                                                            const isSignificant = row.p < 0.05;
                                                            return (
                                                                <TableRow key={i}>
                                                                    <TableCell className="font-medium">{row.covariate || row.index}</TableCell>
                                                                    <TableCell className="text-right font-mono">{row.coef?.toFixed(3)}</TableCell>
                                                                    <TableCell className="text-right font-mono">{row['exp(coef)']?.toFixed(3)}</TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Badge variant={row.p < 0.05 ? 'default' : 'outline'}>
                                                                            {row.p < 0.001 ? '<.001' : row.p?.toFixed(4)}
                                                                        </Badge>
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
                                        </Card>
                                    )}
                                </TabsContent>

                                {/* Log-Normal AFT Tab */}
                                <TabsContent value="aft_lognormal" className="space-y-4 mt-4">
                                    <Alert>
                                        <Info className="h-4 w-4" />
                                        <AlertTitle>Log-Normal AFT Model</AlertTitle>
                                        <AlertDescription>
                                            Accelerated Failure Time model assuming log-normal distribution. Similar interpretation to Weibull AFT 
                                            but with different distributional assumptions. Suitable when hazard rate is non-monotonic.
                                        </AlertDescription>
                                    </Alert>

                                    {results.aft_lognormal && results.aft_lognormal.summary && (
                                        <Card>
                                            <CardHeader>
                                                <CardTitle>Log-Normal AFT Coefficients</CardTitle>
                                                <CardDescription>
                                                    {results.aft_lognormal.aic && (
                                                        <span>AIC: <Badge variant="outline">{results.aft_lognormal.aic.toFixed(2)}</Badge></span>
                                                    )}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Covariate</TableHead>
                                                            <TableHead className="text-right">Coefficient</TableHead>
                                                            <TableHead className="text-right">exp(coef)</TableHead>
                                                            <TableHead className="text-right">p-value</TableHead>
                                                            <TableHead className="text-center">Significance</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {results.aft_lognormal.summary.map((row: any, i: number) => {
                                                            const isSignificant = row.p < 0.05;
                                                            return (
                                                                <TableRow key={i}>
                                                                    <TableCell className="font-medium">{row.covariate || row.index}</TableCell>
                                                                    <TableCell className="text-right font-mono">{row.coef?.toFixed(3)}</TableCell>
                                                                    <TableCell className="text-right font-mono">{row['exp(coef)']?.toFixed(3)}</TableCell>
                                                                    <TableCell className="text-right">
                                                                        <Badge variant={row.p < 0.05 ? 'default' : 'outline'}>
                                                                            {row.p < 0.001 ? '<.001' : row.p?.toFixed(4)}
                                                                        </Badge>
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
                                        </Card>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}

