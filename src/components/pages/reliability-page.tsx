'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sigma, AlertTriangle, Loader2, ShieldCheck, Settings2, Bot, CheckCircle2, FileSearch, HelpCircle, CheckCircle, Gauge, Target, BarChart3, Users, Hash, Activity, Lightbulb, BookOpen } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Label } from '../ui/label';
import Image from 'next/image';

// Type definitions for the rich Reliability results
interface ReliabilityResults {
    alpha: number;
    n_items: number;
    n_cases: number;
    confidence_interval: [number, number];
    sem: number;
    item_statistics: {
        means: { [key: string]: number };
        stds: { [key: string]: number };
        corrected_item_total_correlations: { [key: string]: number };
        alpha_if_deleted: { [key: string]: number };
    };
    scale_statistics: {
        mean: number;
        std: number;
        variance: number;
        avg_inter_item_correlation: number;
    };
    interpretation?: string;
    plot?: string;
}

interface FullAnalysisResponse {
    results: ReliabilityResults;
}

// Statistical Summary Cards Component for Reliability
const StatisticalSummaryCards = ({ results }: { results: ReliabilityResults }) => {
    const getAlphaLevel = (alpha: number) => {
        if (alpha >= 0.9) return 'Excellent';
        if (alpha >= 0.8) return 'Good';
        if (alpha >= 0.7) return 'Acceptable';
        if (alpha >= 0.6) return 'Questionable';
        if (alpha >= 0.5) return 'Poor';
        return 'Unacceptable';
    };
    
    const problematicItems = Object.entries(results.item_statistics.alpha_if_deleted)
        .filter(([_, aid]) => aid > results.alpha).length;
    
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Cronbach&apos;s Alpha</p>
                            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.alpha.toFixed(3)}</p>
                        <Badge className={results.alpha >= 0.7 ? '' : 'bg-destructive'}>
                            {getAlphaLevel(results.alpha)}
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Avg Inter-Item r</p>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {results.scale_statistics.avg_inter_item_correlation.toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {results.scale_statistics.avg_inter_item_correlation > 0.3 ? 'Good coherence' : 'Low coherence'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Scale Items</p>
                            <Hash className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">{results.n_items} / {results.n_cases}</p>
                        <p className="text-xs text-muted-foreground">Items / Cases</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Items to Review</p>
                            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${problematicItems > 0 ? 'text-orange-600' : ''}`}>
                            {problematicItems}
                        </p>
                        <p className="text-xs text-muted-foreground">Would improve α if removed</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Analysis Overview Component
const ReliabilityOverview = ({ selectedItems, reverseCodeItems, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        if (selectedItems.length === 0) {
            overview.push('Select at least 2 scale items to calculate reliability');
        } else if (selectedItems.length < 2) {
            overview.push(`⚠ Only ${selectedItems.length} item selected (minimum 2 required)`);
        } else if (selectedItems.length === 2) {
            overview.push(`Analyzing ${selectedItems.length} items (minimum for alpha)`);
        } else if (selectedItems.length <= 5) {
            overview.push(`Analyzing ${selectedItems.length} items (small scale)`);
        } else if (selectedItems.length <= 10) {
            overview.push(`Analyzing ${selectedItems.length} items (typical scale)`);
        } else if (selectedItems.length <= 20) {
            overview.push(`Analyzing ${selectedItems.length} items (large scale)`);
        } else {
            overview.push(`Analyzing ${selectedItems.length} items (very large scale - consider subscales)`);
        }

        const n = data.length;
        if (n < 30) {
            overview.push(`Sample size: ${n} observations (⚠ Very small - alpha may be unstable)`);
        } else if (n < 100) {
            overview.push(`Sample size: ${n} observations (Small - interpret with caution)`);
        } else if (n < 300) {
            overview.push(`Sample size: ${n} observations (Adequate)`);
        } else {
            overview.push(`Sample size: ${n} observations (Good)`);
        }
        
        if (selectedItems.length >= 2) {
            const ratio = n / selectedItems.length;
            if (ratio < 5) {
                overview.push(`⚠ Subject-to-item ratio: ${ratio.toFixed(1)}:1 (Low - unstable estimates)`);
            } else if (ratio < 10) {
                overview.push(`Subject-to-item ratio: ${ratio.toFixed(1)}:1 (Adequate)`);
            } else if (ratio < 20) {
                overview.push(`Subject-to-item ratio: ${ratio.toFixed(1)}:1 (Good)`);
            } else {
                overview.push(`Subject-to-item ratio: ${ratio.toFixed(1)}:1 (Excellent)`);
            }
        }

        if (reverseCodeItems.length > 0) {
            if (reverseCodeItems.length === 1) {
                overview.push(`1 item will be reverse-coded: ${reverseCodeItems[0]}`);
            } else {
                overview.push(`${reverseCodeItems.length} items will be reverse-coded`);
            }
        } else {
            overview.push('No items selected for reverse-coding');
        }

        overview.push("Method: Cronbach's Alpha (internal consistency)");
        overview.push('Alpha values: ≥0.9 Excellent, ≥0.8 Good, ≥0.7 Acceptable');
        
        const missingCount = selectedItems.reduce((count: number, varName: string) => {
            return count + data.filter((row: any) => row[varName] == null || row[varName] === '').length;
        }, 0);
        
        if (missingCount > 0) {
            const percentMissing = (missingCount / (n * selectedItems.length) * 100).toFixed(1);
            overview.push(`⚠ ${missingCount} missing values (${percentMissing}%) will be handled with listwise deletion`);
        }

        return overview;
    }, [selectedItems, reverseCodeItems, data]);

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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const reliabilityExample = exampleDatasets.find(d => d.id === 'well-being-survey');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <ShieldCheck className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Reliability Analysis (Cronbach&apos;s Alpha)</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Measure the internal consistency of your scales and questionnaires
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Gauge className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Internal Consistency</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Assess how well scale items measure the same construct
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Item Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identify problematic items that reduce reliability
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Scale Improvement</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Optimize your measurement instrument quality
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <FileSearch className="w-5 h-5" />
                            When to Use 
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Use Cronbach&apos;s Alpha when you have multiple questions or items intended to measure a single 
                            underlying concept. It&apos;s essential for validating surveys, psychological scales, educational 
                            assessments, and any multi-item measurement instrument where internal consistency matters.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Items:</strong> At least 2, ideally 3-10 per construct</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> Minimum 30, ideally 100+</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Scale type:</strong> Continuous or ordinal (Likert)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Direction:</strong> Items measuring same direction</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-primary" />
                                    Interpreting Alpha Values
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>≥ 0.9:</strong> Excellent (may indicate redundancy)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>≥ 0.8:</strong> Good reliability</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>≥ 0.7:</strong> Acceptable for research</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>&lt; 0.7:</strong> Questionable to poor</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {reliabilityExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(reliabilityExample)} size="lg">
                                <ShieldCheck className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface ReliabilityPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport: (stats: any, viz: string | null) => void;
}

export default function ReliabilityPage({ data, numericHeaders, onLoadExample, onGenerateReport }: ReliabilityPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [selectedItems, setSelectedItems] = useState<string[]>(numericHeaders);
    const [reverseCodeItems, setReverseCodeItems] = useState<string[]>([]);
    
    const [reliabilityResult, setReliabilityResult] = useState<ReliabilityResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setSelectedItems(numericHeaders);
        setReverseCodeItems([]);
        setReliabilityResult(null);
        setView(data.length > 0 ? 'main' : 'intro');
    }, [data, numericHeaders]);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    const handleItemSelectionChange = (header: string, checked: boolean) => {
        setSelectedItems(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleReverseCodeSelectionChange = (header: string, checked: boolean) => {
        setReverseCodeItems(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (selectedItems.length < 2) {
            toast({variant: 'destructive', title: 'Selection Error', description: 'Please select at least two items for the analysis.'});
            return;
        }

        setIsLoading(true);
        setReliabilityResult(null);

        try {
            const response = await fetch('/api/analysis/reliability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, items: selectedItems, reverseCodeItems })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setReliabilityResult(result);
            toast({ title: 'Analysis Complete', description: "Cronbach's Alpha has been calculated." });

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'Reliability Analysis Error', description: e.message || 'An unexpected error occurred. Please check the console for details.'})
            setReliabilityResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedItems, reverseCodeItems, toast]);
    
    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const interpretationSections = reliabilityResult?.interpretation ? parseInterpretation(reliabilityResult.interpretation) : [];

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Reliability Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>
                        Select the scale items to calculate Cronbach&apos;s Alpha for internal consistency.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Select Items for Analysis</Label>
                        <ScrollArea className="h-48 border rounded-lg p-4 mt-2">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {numericHeaders.map(header => (
                                    <div key={header} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`rel-${header}`}
                                            checked={selectedItems.includes(header)}
                                            onCheckedChange={(checked) => handleItemSelectionChange(header, !!checked)}
                                        />
                                        <label htmlFor={`rel-${header}`} className="text-sm font-medium leading-none">
                                            {header}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    
                    <ReliabilityOverview 
                        selectedItems={selectedItems}
                        reverseCodeItems={reverseCodeItems}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline"><Settings2 className="mr-2"/>Reverse-Code Items</Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                             <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Reverse-Coding</h4>
                                    <p className="text-sm text-muted-foreground">Select negatively worded items to reverse their scores.</p>
                                </div>
                                <ScrollArea className="h-48">
                                    <div className="grid gap-2 p-1">
                                        {selectedItems.map(item => (
                                            <div key={`rev-${item}`} className="flex items-center space-x-2">
                                                <Checkbox
                                                id={`rev-${item}`}
                                                checked={reverseCodeItems.includes(item)}
                                                onCheckedChange={(checked) => handleReverseCodeSelectionChange(item, !!checked)}
                                                />
                                                <label htmlFor={`rev-${item}`} className="text-sm font-medium leading-none">
                                                {item}
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <div className="flex gap-2">
                        {reliabilityResult && <Button variant="ghost" onClick={() => onGenerateReport({ ...reliabilityResult, analysisType: 'reliability' }, null)}><Bot className="mr-2"/>AI Report</Button>}
                        <Button onClick={handleAnalysis} className="w-full md:w-auto" disabled={selectedItems.length < 2 || isLoading}>
                            {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
                        </Button>
                    </div>
                </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-muted-foreground">Performing reliability analysis...</p>
                            <Skeleton className="h-48 w-full" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {reliabilityResult ? (
                <>
                    {/* Statistical Summary Cards */}
                    <StatisticalSummaryCards results={reliabilityResult} />
                    
                    {/* Detailed Analysis Section */}
                    {interpretationSections.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Detailed Analysis</CardTitle>
                                <CardDescription>Comprehensive interpretation of reliability results</CardDescription>
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
                                                                            .replace(/α/g, '<i>α</i>')
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

                    {/* Visualization */}
                    {reliabilityResult.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Reliability Visualization</CardTitle>
                                <CardDescription>Item correlations, alpha analysis, and descriptive statistics</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Image 
                                    src={reliabilityResult.plot}
                                    alt="Reliability Analysis Plots" 
                                    width={1400} 
                                    height={1200} 
                                    className="w-full rounded-md border"
                                />
                            </CardContent>
                        </Card>
                    )}

                    <div className="grid gap-4 lg:grid-cols-3">
                        <div className="lg:col-span-2 flex flex-col gap-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="font-headline">Scale Statistics</CardTitle>
                                    <CardDescription>Overall characteristics of the scale.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Scale Mean</p>
                                                <p className="text-xl font-semibold">{reliabilityResult.scale_statistics.mean.toFixed(3)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Scale Variance</p>
                                                <p className="text-xl font-semibold">{reliabilityResult.scale_statistics.variance.toFixed(3)}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Scale Std Dev</p>
                                                <p className="text-xl font-semibold">{reliabilityResult.scale_statistics.std.toFixed(3)}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Standard Error</p>
                                                <p className="text-xl font-semibold">{reliabilityResult.sem.toFixed(3)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle className="font-headline">Item-Total Statistics</CardTitle>
                                <CardDescription>How each item relates to the overall scale.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <ScrollArea className="h-[450px]">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-card">
                                            <TableRow>
                                                <TableHead>Item</TableHead>
                                                <TableHead className="text-right">Corrected Item-Total Corr.</TableHead>
                                                <TableHead className="text-right">Alpha if Deleted</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Object.keys(reliabilityResult.item_statistics.means).map((item) => {
                                                const citc = reliabilityResult.item_statistics.corrected_item_total_correlations[item];
                                                const aid = reliabilityResult.item_statistics.alpha_if_deleted[item];
                                                return (
                                                <TableRow key={item}>
                                                    <TableCell className="font-medium">{item}</TableCell>
                                                    <TableCell className={`text-right font-mono ${citc < 0.3 ? 'text-destructive' : ''}`}>{citc.toFixed(3)}</TableCell>
                                                    <TableCell className={`text-right font-mono ${aid > reliabilityResult.alpha ? 'text-green-600' : ''}`}>{aid.toFixed(3)}</TableCell>
                                                </TableRow>
                                            )})}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CardContent>
                        </Card>
                    </div>
                </>
            ) : (
                 !isLoading && <div className="text-center text-muted-foreground py-10">
                    <ShieldCheck className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select items and click &apos;Run Analysis&apos; to see the reliability results.</p>
                </div>
            )}
        </div>
    );
}

