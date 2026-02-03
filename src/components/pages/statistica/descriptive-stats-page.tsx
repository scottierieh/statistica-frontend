'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, Brain, AlertTriangle, BookOpen, Coffee, Settings, MoveRight, BarChart as BarChartIcon, HelpCircle, Sparkles, Grid3x3, PieChart as PieChartIcon, FileSearch, Lightbulb, CheckCircle, Download, FileSpreadsheet, ImageIcon, Database, Settings2, Shield, FileText, BarChart3, ChevronRight, ChevronLeft, Check, CheckCircle2, Info, ArrowRight, ChevronDown, FileCode, FileType, Target, Activity, TrendingUp, Hash, Percent, Code, Copy, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '../../ui/scroll-area';
import { type DataSet } from '@/lib/stats';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Badge } from '../../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Papa from 'papaparse';
import { Separator } from '@/components/ui/separator';



const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || "hhttps://statistica-api-dm6treznqq-du.a.run.app";

// Firebase Storage URL for Python code
const PYTHON_CODE_URL = "https://firebasestorage.googleapis.com/v0/b/restart2-98207181-3e3a5.firebasestorage.app/o/descriptive_statistics.py?alt=media";

interface NumericStats {
    count: number;
    missing: number;
    mean: number;
    stdDev: number;
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    skewness: number;
    kurtosis: number;
}

interface CategoricalFreqItem {
    Value: string | number;
    Frequency: number;
    Percentage: number;
}

interface CategoricalStats {
    table: CategoricalFreqItem[];
    summary: {
        count: number;
        missing: number;
        unique: number;
        mode: string | number | null;
    };
}

interface VariableResult {
    type: 'numeric' | 'categorical';
    stats?: NumericStats;
    table?: CategoricalFreqItem[];
    summary?: CategoricalStats['summary'];
    plot?: string;
    insights?: string[];
    error?: string;
    groupedStats?: { [key: string]: NumericStats };
    groupedTable?: { [key: string]: CategoricalFreqItem[] };
}

interface FullAnalysisResponse {
    results: {
        [key: string]: VariableResult;
    };
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEPS: { id: Step; label: string }[] = [
    { id: 1, label: 'Variables' },
    { id: 2, label: 'Settings' },
    { id: 3, label: 'Validation' },
    { id: 4, label: 'Summary' },
    { id: 5, label: 'Reasoning' },
    { id: 6, label: 'Statistics' }
];

const metricDefinitions: Record<string, string> = {
    count: "The number of non-missing observations.",
    missing: "The number of missing (null or empty) values.",
    mean: "The arithmetic average of the data.",
    stdDev: "Standard Deviation: a measure of the amount of variation or dispersion of a set of values.",
    min: "The minimum value in the dataset.",
    q1: "The 25th percentile; 25% of data falls below this value.",
    median: "The middle value of the dataset, separating the higher half from the lower half.",
    q3: "The 75th percentile; 75% of data falls below this value.",
    max: "The maximum value in the dataset.",
    skewness: "A measure of the asymmetry of the probability distribution. A value of 0 indicates a symmetrical distribution.",
    kurtosis: "A measure of the 'tailedness' of the probability distribution. High kurtosis indicates heavy tails, or outliers.",
    unique: "The number of distinct categories in the variable.",
    mode: "The most frequently occurring value in the dataset."
};

const IntroPage = ({ onLoadExample }: { onLoadExample: (e: ExampleDataSet) => void }) => {
    const irisExample = exampleDatasets.find(ex => ex.id === 'iris');
    const tipsExample = exampleDatasets.find(ex => ex.id === 'tips-data');

    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <BarChartIcon className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Descriptive Statistics</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Understand your data at a glance — find patterns, spot outliers, and see what&apos;s typical
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Grid3x3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">What&apos;s Typical?</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Find the average, middle value, and most common values in your data
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Sparkles className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">How Spread Out?</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    See if values cluster together or are widely scattered
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <PieChartIcon className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Any Patterns?</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Visualize distributions and spot unusual values
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use This Analysis
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Start here before any analysis! Descriptive statistics help you understand what you&apos;re working with. 
                            Are there outliers? Missing data? Skewed distributions? Know your data before making decisions.
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
                                        <span><strong>Any data:</strong> Works with numbers and categories</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Any size:</strong> From a few rows to thousands</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Optional grouping:</strong> Compare subgroups</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    What You&apos;ll Learn
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Center:</strong> Average and middle values</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Spread:</strong> How variable is your data?</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Shape:</strong> Symmetric or skewed?</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center gap-4 pt-2">
                        {tipsExample && (
                            <Button onClick={() => onLoadExample(tipsExample)} size="lg" variant="outline">
                                <Coffee className="mr-2 h-5 w-5" />
                                Load Tips Dataset
                            </Button>
                        )}
                        {irisExample && (
                            <Button onClick={() => onLoadExample(irisExample)} size="lg">
                                {irisExample.icon && <irisExample.icon className="mr-2 h-5 w-5" />}
                                Load Iris Dataset
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const SummaryTable = ({ results, selectedVars, numericHeaders, categoricalHeaders, groupByVar }: { results: FullAnalysisResponse['results'], selectedVars: string[], numericHeaders: string[], categoricalHeaders: string[], groupByVar?: string }) => {
    const numericVars = selectedVars.filter(v => numericHeaders.includes(v) && results[v]?.type === 'numeric' && !results[v].error);
    const categoricalVars = selectedVars.filter(v => categoricalHeaders.includes(v) && results[v]?.type === 'categorical' && !results[v].error);

    const numericMetrics: (keyof NumericStats)[] = ['count', 'missing', 'mean', 'stdDev', 'min', 'q1', 'median', 'q3', 'max', 'skewness', 'kurtosis'];
    const categoricalMetrics: (keyof CategoricalStats['summary'])[] = ['count', 'unique', 'mode'];

    // 그룹별 통계에 사용할 메트릭 (전체 통계와 동일)
    const groupedNumericMetrics: (keyof NumericStats)[] = ['count', 'missing', 'mean', 'stdDev', 'min', 'q1', 'median', 'q3', 'max', 'skewness', 'kurtosis'];

    const formatMetricName = (metric: string): string => {
        return metric
            .replace(/([A-Z])/g, ' $1')
            .replace('q1', '25th %')
            .replace('q3', '75th %')
            .replace(/^\w/, c => c.toUpperCase());
    };

    return (
        <div className="space-y-6">
            <TooltipProvider>
                <Card>
                    <CardHeader>
                        <CardTitle>Overall Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {numericVars.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-semibold mb-2">Numeric Variables</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Statistic</TableHead>
                                            {numericVars.map(v => <TableHead key={v} className="text-right">{v}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {numericMetrics.map(metric => (
                                            <TableRow key={metric}>
                                                <TableCell className="font-medium">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className="cursor-help border-b border-dashed border-muted-foreground">
                                                                {formatMetricName(metric)}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{metricDefinitions[metric]}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableCell>
                                                {numericVars.map(v => {
                                                    const statValue = results[v]?.stats?.[metric];
                                                    return <TableCell key={`${metric}-${v}`} className="text-right font-mono">{typeof statValue === 'number' ? statValue.toFixed(2) : 'N/A'}</TableCell>
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        {categoricalVars.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-2">Categorical Variables</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Statistic</TableHead>
                                            {categoricalVars.map(v => <TableHead key={v} className="text-right">{v}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {categoricalMetrics.map(metric => (
                                            <TableRow key={metric}>
                                                <TableCell className="font-medium">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                             <span className="cursor-help border-b border-dashed border-muted-foreground">
                                                                {metric.replace(/\b\w/g, l => l.toUpperCase())}
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{metricDefinitions[metric]}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableCell>
                                                {categoricalVars.map(v => {
                                                    const statValue = (results[v] as VariableResult)?.summary?.[metric];
                                                    return <TableCell key={`${metric}-${v}`} className="text-right font-mono">{String(statValue ?? 'N/A')}</TableCell>
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TooltipProvider>

            {/* 수정된 그룹별 통계 섹션 - 전체 통계 표시 */}
            {groupByVar && (
                <TooltipProvider>
                    <Card>
                        <CardHeader>
                            <CardTitle>Grouped Summary by &apos;{groupByVar}&apos;</CardTitle>
                            <CardDescription>Full statistics for each group</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {numericVars.map(v => {
                                const groupedStats = results[v]?.groupedStats;
                                if (!groupedStats || Object.keys(groupedStats).length === 0) return null;
                                
                                return (
                                    <div key={`grouped-${v}`}>
                                        <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-primary" />
                                            {v}
                                        </h4>
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="sticky left-0 bg-background z-10 min-w-[100px]">
                                                            {groupByVar}
                                                        </TableHead>
                                                        {groupedNumericMetrics.map(metric => (
                                                            <TableHead key={metric} className="text-right whitespace-nowrap min-w-[80px]">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className="cursor-help border-b border-dashed border-muted-foreground">
                                                                            {formatMetricName(metric)}
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>{metricDefinitions[metric]}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TableHead>
                                                        ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {Object.entries(groupedStats).map(([groupName, stats]) => (
                                                        <TableRow key={groupName}>
                                                            <TableCell className="sticky left-0 bg-background z-10 font-medium">
                                                                {groupName}
                                                            </TableCell>
                                                            {groupedNumericMetrics.map(metric => {
                                                                const value = stats[metric];
                                                                return (
                                                                    <TableCell key={`${groupName}-${metric}`} className="text-right font-mono">
                                                                        {typeof value === 'number' ? value.toFixed(2) : 'N/A'}
                                                                    </TableCell>
                                                                );
                                                            })}
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* 범주형 변수 그룹별 통계 */}
                            {categoricalVars.map(v => {
                                const groupedTable = results[v]?.groupedTable;
                                if (!groupedTable || Object.keys(groupedTable).length === 0) return null;

                                return (
                                    <div key={`grouped-cat-${v}`}>
                                        <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                                            <PieChartIcon className="w-5 h-5 text-primary" />
                                            {v}
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {Object.entries(groupedTable).map(([groupName, freqItems]) => (
                                                <Card key={groupName} className="border">
                                                    <CardHeader className="py-3">
                                                        <CardTitle className="text-sm">{groupByVar} = {groupName}</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="py-2">
                                                        <ScrollArea className="h-32">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead className="text-xs">Value</TableHead>
                                                                        <TableHead className="text-right text-xs">Count</TableHead>
                                                                        <TableHead className="text-right text-xs">%</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {freqItems.map((item, idx) => (
                                                                        <TableRow key={idx}>
                                                                            <TableCell className="text-xs">{String(item.Value)}</TableCell>
                                                                            <TableCell className="text-right text-xs font-mono">{item.Frequency}</TableCell>
                                                                            <TableCell className="text-right text-xs font-mono">{item.Percentage.toFixed(1)}%</TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </ScrollArea>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </TooltipProvider>
            )}
        </div>
    )
};

const AnalysisDisplay = ({ result, varName }: { result: VariableResult, varName: string }) => {
    const isNumeric = result.type === 'numeric';
    const stats = result.stats;

    return (
        <Card>
            <CardHeader><CardTitle>{varName}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.plot && (
                    <div className="w-full h-full flex items-center justify-center">
                        <Image src={result.plot?.startsWith('data:') ? result.plot : `data:image/png;base64,${result.plot}`} alt="Distribution Plot" width={600} height={400} className="rounded-md border" />
                    </div>
                )}
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2"><CardTitle className="text-base">Summary</CardTitle></CardHeader>
                        <CardContent>
                            <TooltipProvider>
                                {isNumeric && stats ? (
                                    <Table>
                                        <TableBody>
                                            {(Object.keys(stats) as (keyof NumericStats)[]).map(key => (
                                                <TableRow key={key}>
                                                    <TableCell className="font-medium">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span>{key.replace(/([A-Z])/g, ' $1').replace(/\b\w/g, l => l.toUpperCase())}</span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>{metricDefinitions[key]}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">{(stats as NumericStats)[key]?.toFixed(2) ?? 'N/A'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : result.table && result.summary ? (
                                    <ScrollArea className="h-64">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Value</TableHead><TableHead className="text-right">Count</TableHead><TableHead className="text-right">%</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {result.table.map((item, i: number) => <TableRow key={i}><TableCell>{String(item.Value)}</TableCell><TableCell className="text-right">{item.Frequency}</TableCell><TableCell className="text-right">{item.Percentage.toFixed(1)}%</TableCell></TableRow>)}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                ) : <p>No statistics available.</p>}
                            </TooltipProvider>
                        </CardContent>
                    </Card>
                     {result.insights && result.insights.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Key Insights</CardTitle></CardHeader>
                            <CardContent><ul className="space-y-2 text-sm list-disc pl-4">{result.insights.map((insight, i) => <li key={i}>{insight}</li>)}</ul></CardContent>
                        </Card>
                    )}
                </div>
            </CardContent>
        </Card>
    )
};

// Python Code Modal Component
const PythonCodeModal = ({ 
    isOpen, 
    onClose, 
    codeUrl 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    codeUrl: string;
}) => {
    const { toast } = useToast();
    const [code, setCode] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && !code) {
            fetchCode();
        }
    }, [isOpen, code]);

    const fetchCode = async () => {
        setIsLoading(true);
        setError(null);
        
        try {
            const response = await fetch(codeUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch code: ${response.status}`);
            }
            const text = await response.text();
            setCode(text);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load Python code';
            setError(errorMessage);
            toast({ 
                variant: 'destructive', 
                title: 'Error', 
                description: 'Failed to load Python code' 
            });
        } finally {
            setIsLoading(false);
        }
    };


    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Copied!', description: 'Code copied to clipboard' });
    };

    const handleDownload = () => {
        const blob = new Blob([code], { type: 'text/x-python' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'descriptive_statistics.py';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast({ title: 'Downloaded!', description: 'Python file saved' });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Code className="w-5 h-5 text-primary" />
                        Python Code - Descriptive Statistics
                    </DialogTitle>
                    <DialogDescription>
                        View, copy, or download the Python code used for this analysis.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex gap-2 py-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleCopy} 
                        disabled={isLoading || !!error}
                    >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Code
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleDownload} 
                        disabled={isLoading || !!error}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Download .py
                    </Button>
                    {error && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={fetchCode}
                        >
                            <Loader2 className="mr-2 h-4 w-4" />
                            Retry
                        </Button>
                    )}
                </div>
                
                <div className="flex-1 min-h-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64 bg-slate-950 rounded-lg">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <span className="ml-3 text-slate-300">Loading code...</span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 bg-slate-950 rounded-lg text-center">
                            <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
                            <p className="text-slate-300 mb-2">Failed to load code</p>
                            <p className="text-slate-500 text-sm">{error}</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[50vh] w-full rounded-lg border bg-slate-950">
                            <pre className="p-4 text-sm text-slate-50 overflow-x-auto">
                                <code className="language-python">{code}</code>
                            </pre>
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

const GlossaryModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-primary" />
                        Statistical Terms Glossary
                    </DialogTitle>
                    <DialogDescription>
                        Definitions of statistical measures used in this analysis
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4">
                        {Object.entries(metricDefinitions).map(([term, definition]) => (
                            <div key={term} className="border-b pb-3">
                                <h4 className="font-semibold capitalize">
                                    {term.replace(/([A-Z])/g, ' $1').replace('q1', 'Q1 (25th Percentile)').replace('q3', 'Q3 (75th Percentile)')}
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">{definition}</p>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};


interface DescriptiveStatsPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    restoredState?: {
        params?: {
            selectedVars?: string[];
            groupByVar?: string;
        };
        results?: FullAnalysisResponse['results'];
    };
    onAnalysisComplete?: (result: FullAnalysisResponse) => void;
}

export default function DescriptiveStatisticsPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample, restoredState, onAnalysisComplete}: DescriptiveStatsPageProps) {
    const { toast } = useToast();
    const resultsRef = useRef<HTMLDivElement>(null);
    
    // View and step state
    const [view, setView] = useState<'intro' | 'main'>('intro');
    const [currentStep, setCurrentStep] = useState<Step>(1);
    const [maxReachedStep, setMaxReachedStep] = useState<Step>(1);
    
    // Form state
    const [selectedVars, setSelectedVars] = useState<string[]>([]);
    const [groupByVar, setGroupByVar] = useState<string | undefined>();
    
    // Results state
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    // Python code modal state
    const [pythonCodeModalOpen, setPythonCodeModalOpen] = useState(false);
    const [glossaryModalOpen, setGlossaryModalOpen] = useState(false);
    const [showGuide, setShowGuide] = useState(false);  // 👈 추가


    const canRun = useMemo(() => data.length > 0 && allHeaders.length > 0, [data, allHeaders]);

    // Derived values
    const numericSelectedVars = useMemo(() => selectedVars.filter(v => numericHeaders.includes(v)), [selectedVars, numericHeaders]);
    const categoricalSelectedVars = useMemo(() => selectedVars.filter(v => categoricalHeaders.includes(v)), [selectedVars, categoricalHeaders]);

    // Initialize when data changes
    useEffect(() => {
        if (canRun) {
            setSelectedVars(allHeaders.slice(0, 5)); // Select first 5 by default
            setView('main');
        } else {
            setView('intro');
        }
        setAnalysisResult(null);
        setCurrentStep(1);
        setMaxReachedStep(1);
    }, [allHeaders, data, canRun]);

    // Restore state if provided
    useEffect(() => {
        if (restoredState) {
            setSelectedVars(restoredState.params?.selectedVars || []);
            setGroupByVar(restoredState.params?.groupByVar);
            setAnalysisResult(restoredState.results ? { results: restoredState.results } : null);
            setView('main');
            setCurrentStep(4);
            setMaxReachedStep(6);
        }
    }, [restoredState]);

    // Validation checks
    const dataValidation = useMemo(() => {
        const checks = [];
        checks.push({
            label: 'Variables selected',
            passed: selectedVars.length > 0,
            detail: selectedVars.length > 0 ? `${selectedVars.length} variable(s) selected` : 'Select at least one variable'
        });
        
        const missingCount = selectedVars.reduce((count, varName) => {
            return count + data.filter(row => row[varName] == null || row[varName] === '').length;
        }, 0);
        
        checks.push({
            label: 'Data completeness',
            passed: missingCount === 0,
            detail: missingCount === 0 ? 'No missing values detected' : `${missingCount} missing values found (will be excluded)`
        });
        
        checks.push({
            label: 'Sample size',
            passed: data.length >= 5,
            detail: `${data.length} observations available`
        });
        
        return checks;
    }, [selectedVars, data]);

    const allValidationsPassed = dataValidation.every(check => check.passed) || dataValidation.filter(c => !c.passed).every(c => c.label === 'Data completeness');

    // Navigation
    const goToStep = useCallback((step: Step) => {
        setCurrentStep(step);
        setMaxReachedStep(prev => Math.max(prev, step) as Step);
    }, []);

    const nextStep = useCallback(() => {
        if (currentStep === 3) {
            runAnalysis();
        } else if (currentStep < 6) {
            goToStep((currentStep + 1) as Step);
        }
    }, [currentStep, goToStep]);

    const prevStep = useCallback(() => {
        if (currentStep > 1) goToStep((currentStep - 1) as Step);
    }, [currentStep, goToStep]);

    // Variable selection
    const handleVarSelectionChange = (varName: string, isChecked: boolean) => {
        setSelectedVars(prev => isChecked ? [...prev, varName] : prev.filter(v => v !== varName));
    };

    const selectAll = () => setSelectedVars([...allHeaders]);
    const selectNone = () => setSelectedVars([]);
    const selectNumeric = () => setSelectedVars([...numericHeaders]);
    const selectCategorical = () => setSelectedVars([...categoricalHeaders]);

    // Analysis
    const runAnalysis = useCallback(async () => {
        if (selectedVars.length === 0) {
            toast({ title: "No Variables Selected", description: "Please select at least one variable.", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch(`${FASTAPI_URL}/api/analysis/descriptive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, variables: selectedVars, groupBy: groupByVar })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as FullAnalysisResponse & { error?: string }).error) throw new Error((result as FullAnalysisResponse & { error?: string }).error);

            setAnalysisResult(result);
            onAnalysisComplete?.(result);
            goToStep(4);
            toast({ title: "Analysis Complete", description: `Descriptive statistics generated for ${selectedVars.length} variable(s).` });

        } catch (e: unknown) {
            console.error('Analysis error:', e);
            const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
            toast({ variant: 'destructive', title: 'Analysis Error', description: errorMessage });
        } finally {
            setIsLoading(false);
        }
    }, [data, selectedVars, groupByVar, toast, goToStep, onAnalysisComplete]);

    // Downloads
    const handleDownloadPNG = useCallback(async () => {
        if (!resultsRef.current) return;
        setIsDownloading(true);
        try {
            const canvas = await html2canvas(resultsRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.download = `Descriptive_Statistics_${new Date().toISOString().split('T')[0]}.png`;
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
        let csvContent = "";
        
        const numericVars = selectedVars.filter(v => numericHeaders.includes(v) && results[v]?.type === 'numeric');
        if (numericVars.length > 0) {
            csvContent += "NUMERIC VARIABLES SUMMARY\n";
            const numericData = numericVars.map(varName => {
                const stats = results[varName]?.stats;
                return stats ? {
                    Variable: varName,
                    Count: stats.count,
                    Mean: stats.mean?.toFixed(4),
                    'Std Dev': stats.stdDev?.toFixed(4),
                    Min: stats.min?.toFixed(4),
                    Median: stats.median?.toFixed(4),
                    Max: stats.max?.toFixed(4)
                } : null;
            }).filter(Boolean);
            csvContent += Papa.unparse(numericData) + "\n\n";
        }
        
        const categoricalVars = selectedVars.filter(v => categoricalHeaders.includes(v) && results[v]?.type === 'categorical');
        if (categoricalVars.length > 0) {
            csvContent += "CATEGORICAL VARIABLES SUMMARY\n";
            const categoricalData = categoricalVars.map(varName => {
                const summary = results[varName]?.summary;
                return summary ? { Variable: varName, Count: summary.count, Unique: summary.unique, Mode: summary.mode } : null;
            }).filter(Boolean);
            csvContent += Papa.unparse(categoricalData) + "\n\n";
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Descriptive_Statistics_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast({ title: "CSV Downloaded" });
    }, [analysisResult, selectedVars, numericHeaders, categoricalHeaders, toast]);


    const handleDownloadDOCX = useCallback(async () => {
        if (!analysisResult) return;
        toast({ title: "Generating Word..." });
        try {
            const response = await fetch('/api/export/descriptive-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    results: analysisResult.results,
                    selectedVars,
                    groupByVar,
                    numericHeaders,
                    categoricalHeaders,
                    totalRows: data.length
                })
            });
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Descriptive_Statistics_${new Date().toISOString().split('T')[0]}.docx`;
            link.click();
            toast({ title: "Download Complete" });
        } catch (e) {
            toast({ variant: 'destructive', title: "Failed" });
        }
    }, [analysisResult, selectedVars, groupByVar, numericHeaders, categoricalHeaders, data.length, toast]);


// Descriptive Statistics Analysis Guide Component
const DescriptiveGuide: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-background rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Descriptive Statistics Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          
          <div className="p-6 space-y-6">
            {/* What is Descriptive Statistics */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <BarChartIcon className="w-4 h-4" />
                What are Descriptive Statistics?
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                Descriptive statistics <strong>summarize and describe</strong> the main features of a dataset. 
                They help you understand what&apos;s typical, how spread out values are, and the overall shape of your data 
                — all without making inferences about a larger population.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground">
                  <strong>Why Start Here?</strong><br/>
                  <span className="text-muted-foreground text-xs">
                    Before any advanced analysis, you need to know your data. Descriptive statistics reveal 
                    missing values, outliers, skewness, and patterns that affect all subsequent analyses.
                  </span>
                </p>
              </div>
            </div>

            <Separator />

            {/* Measures of Central Tendency */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Measures of Central Tendency
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                These statistics tell you what&apos;s &quot;typical&quot; or &quot;average&quot; in your data.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Mean (Average)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sum of all values divided by the count. <strong>Sensitive to outliers</strong> — 
                    a few extreme values can pull the mean significantly.
                    <br/><em>Example: Income data with billionaires will have a misleadingly high mean.</em>
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Median (Middle Value)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The middle value when data is sorted. <strong>Robust to outliers</strong> — 
                    not affected by extreme values.
                    <br/><em>Use median when data is skewed or has outliers.</em>
                  </p>
                </div>
                
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Mode (Most Frequent)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The most commonly occurring value. Useful for categorical data and identifying peaks 
                    in distributions.
                  </p>
                </div>
              </div>
              
              <div className="mt-3 p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                <p className="font-medium text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  When Mean ≠ Median
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  If mean and median are very different, your data is likely skewed. In skewed data, 
                  the <strong>median</strong> is often a better representation of &quot;typical.&quot;
                </p>
              </div>
            </div>

            <Separator />

            {/* Measures of Spread */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Measures of Spread (Variability)
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                These tell you how spread out or clustered your data values are.
              </p>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Range (Max - Min)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The difference between the largest and smallest values. Simple but affected by outliers.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Standard Deviation (SD)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Average distance of values from the mean. <strong>Key measure of variability.</strong>
                    <br/>Small SD = values cluster tightly around mean
                    <br/>Large SD = values spread widely
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Variance (SD²)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Standard deviation squared. Less interpretable than SD but useful in statistical formulas.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <p className="font-medium text-sm text-primary">Interquartile Range (IQR = Q3 - Q1)</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The range of the middle 50% of data. <strong>Robust to outliers.</strong>
                    <br/>Used in box plots and outlier detection (values beyond 1.5×IQR from quartiles).
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Percentiles and Quartiles */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Percentiles and Quartiles
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Percentiles divide your data into 100 equal parts; quartiles divide it into 4.
              </p>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded bg-muted text-center">
                  <p className="font-medium">Min</p>
                  <p className="text-muted-foreground">0th %ile</p>
                </div>
                <div className="p-2 rounded bg-muted text-center">
                  <p className="font-medium">Q1</p>
                  <p className="text-muted-foreground">25th %ile</p>
                </div>
                <div className="p-2 rounded bg-muted text-center">
                  <p className="font-medium">Median</p>
                  <p className="text-muted-foreground">50th %ile</p>
                </div>
                <div className="p-2 rounded bg-muted text-center">
                  <p className="font-medium">Q3</p>
                  <p className="text-muted-foreground">75th %ile</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>Interpretation:</strong> Q1 means 25% of data falls below this value. 
                The median (Q2) splits data in half.
              </p>
            </div>

            <Separator />

            {/* Shape of Distribution */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Shape of Distribution
              </h3>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Skewness</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures asymmetry of the distribution.
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">Skew &lt; 0</p>
                      <p className="text-muted-foreground">Left-skewed</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">Skew ≈ 0</p>
                      <p className="text-muted-foreground">Symmetric</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">Skew &gt; 0</p>
                      <p className="text-muted-foreground">Right-skewed</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Kurtosis</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Measures &quot;tailedness&quot; — how much data is in the tails vs center.
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">Low</p>
                      <p className="text-muted-foreground">Thin tails</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">Normal</p>
                      <p className="text-muted-foreground">≈ 3</p>
                    </div>
                    <div className="p-1 rounded bg-muted text-center">
                      <p className="font-medium">High</p>
                      <p className="text-muted-foreground">Heavy tails/outliers</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Categorical Data */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4" />
                Categorical Data
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                For non-numeric categories, we use different measures:
              </p>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Frequency Count</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    How many times each category appears.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Percentage / Proportion</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    What fraction of the total each category represents.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Mode</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    The most frequent category.
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm">Unique Count</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Number of distinct categories.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Best Practices */}
            <div>
              <h3 className="font-semibold text-primary mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Best Practices
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Always Check First</p>
                  <p className="text-xs text-muted-foreground">
                    Run descriptive stats before any analysis. Look for missing values, 
                    outliers, and unexpected patterns.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Report Both Mean & Median</p>
                  <p className="text-xs text-muted-foreground">
                    If they differ substantially, data is skewed. Report median for 
                    skewed data; mean for symmetric.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Include Spread Measures</p>
                  <p className="text-xs text-muted-foreground">
                    Never report just the mean/median. Always include standard deviation 
                    or IQR to show variability.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-border bg-muted/10">
                  <p className="font-medium text-sm text-primary mb-1">Visualize Your Data</p>
                  <p className="text-xs text-muted-foreground">
                    Histograms, box plots, and bar charts reveal patterns that 
                    numbers alone may hide.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-primary">Remember:</strong> Descriptive statistics are your data&apos;s &quot;first impression.&quot; 
                They don&apos;t prove anything or make predictions — they simply describe what you have. 
                Use them to understand your data before testing hypotheses, building models, or drawing conclusions.
                Good analysis always starts with knowing your numbers!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
};


    // Intro page
    if (view === 'intro' || !canRun) {
        return <IntroPage onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    // Get summary stats for Step 4
    const getSummaryStats = () => {
        if (!results) return null;
        
        const numericVars = selectedVars.filter(v => numericHeaders.includes(v) && results[v]?.type === 'numeric');
        const categoricalVars = selectedVars.filter(v => categoricalHeaders.includes(v) && results[v]?.type === 'categorical');
        
        let totalMissing = 0;
        let hasOutliers = false;
        let hasSkewedData = false;
        
        numericVars.forEach(v => {
            const stats = results[v]?.stats;
            if (stats) {
                totalMissing += stats.missing || 0;
                if (Math.abs(stats.skewness) > 1) hasSkewedData = true;
                // Simple outlier check using IQR
                const iqr = stats.q3 - stats.q1;
                if (stats.min < stats.q1 - 1.5 * iqr || stats.max > stats.q3 + 1.5 * iqr) hasOutliers = true;
            }
        });
        
        return { numericVars, categoricalVars, totalMissing, hasOutliers, hasSkewedData };
    };

    const summaryStats = results ? getSummaryStats() : null;

    const ProgressBar = () => (
        <div className="w-full mb-8">
            <div className="flex items-center justify-between">
                {STEPS.map((step) => {
                    const isCompleted = step.id < currentStep;
                    const isCurrent = step.id === currentStep;
                    const isClickable = step.id <= maxReachedStep;
                    return (
                        <button key={step.id} onClick={() => isClickable && goToStep(step.id)} disabled={!isClickable}
                            className={`flex flex-col items-center gap-2 flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 border-2 ${isCurrent ? 'bg-primary text-primary-foreground border-primary scale-110 shadow-lg' : isCompleted ? 'bg-primary/80 text-primary-foreground border-primary/80' : 'bg-background border-muted-foreground/30 text-muted-foreground'}`}>
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
            <DescriptiveGuide isOpen={showGuide} onClose={() => setShowGuide(false)} />
            <GlossaryModal isOpen={glossaryModalOpen} onClose={() => setGlossaryModalOpen(false)} />
            <PythonCodeModal isOpen={pythonCodeModalOpen} onClose={() => setPythonCodeModalOpen(false)} codeUrl={PYTHON_CODE_URL} />
    
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Descriptive Statistics</h1>
                    <p className="text-muted-foreground mt-1">Explore and summarize your data distributions</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowGuide(true)}>
                        <BookOpen className="w-4 h-4 mr-2" />
                        Analysis Guide
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setGlossaryModalOpen(true)}>
                        <HelpCircle className="w-5 h-5"/>
                    </Button>
                </div>
            </div>
            <ProgressBar />

            
            <div>
                {/* Step 1: Select Variables */}
                {currentStep === 1 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Database className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Select Variables to Analyze</CardTitle>
                                    <CardDescription>Choose which columns you want to explore</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-wrap gap-2 mb-4">
                                <Button variant="outline" size="sm" onClick={selectAll}>Select All</Button>
                                <Button variant="outline" size="sm" onClick={selectNone}>Clear All</Button>
                                <Button variant="outline" size="sm" onClick={selectNumeric}>Numeric Only</Button>
                                <Button variant="outline" size="sm" onClick={selectCategorical}>Categorical Only</Button>
                            </div>
                            
                            <ScrollArea className="h-48 border rounded-lg p-4">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {allHeaders.map(h => (
                                        <div key={h} className="flex items-center space-x-2">
                                            <Checkbox 
                                                id={`var-${h}`} 
                                                checked={selectedVars.includes(h)}
                                                onCheckedChange={(checked) => handleVarSelectionChange(h, !!checked)} 
                                            />
                                            <Label htmlFor={`var-${h}`} className="text-sm font-medium cursor-pointer">
                                                {h}
                                                <Badge variant="outline" className="ml-2 text-xs">
                                                    {numericHeaders.includes(h) ? 'Num' : 'Cat'}
                                                </Badge>
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            
                            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                                <Info className="w-5 h-5 text-muted-foreground shrink-0" />
                                <div className="text-sm text-muted-foreground">
                                    <strong className="text-foreground">{selectedVars.length}</strong> variables selected 
                                    ({numericSelectedVars.length} numeric, {categoricalSelectedVars.length} categorical) 
                                    from <strong className="text-foreground">{data.length}</strong> observations
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4">
                            <Button onClick={nextStep} className="ml-auto" size="lg" disabled={selectedVars.length === 0}>
                                Next<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 2: Settings */}
                {currentStep === 2 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Settings2 className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Analysis Settings</CardTitle>
                                    <CardDescription>Configure how to analyze your data</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Group By (Optional)</Label>
                                <Select value={groupByVar || 'none'} onValueChange={(v) => setGroupByVar(v === 'none' ? undefined : v)}>
                                    <SelectTrigger className="h-11 max-w-md">
                                        <SelectValue placeholder="No grouping" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No grouping — analyze all data together</SelectItem>
                                        {categoricalHeaders.map(h => (
                                            <SelectItem key={h} value={h}>{h}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Compare statistics across different groups (e.g., by gender, region, category)
                                </p>
                            </div>

                            <div className="p-5 bg-muted/50 rounded-xl space-y-3">
                                <h4 className="font-medium text-sm">Analysis Overview</h4>
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    <p>• <strong className="text-foreground">{numericSelectedVars.length}</strong> numeric variables → Mean, Median, Std Dev, Range, Quartiles</p>
                                    <p>• <strong className="text-foreground">{categoricalSelectedVars.length}</strong> categorical variables → Frequency counts, Percentages, Mode</p>
                                    {groupByVar && <p>• <strong className="text-foreground">Grouped by:</strong> {groupByVar}</p>}
                                    <p>• Charts and visualizations will be generated</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}><ChevronLeft className="mr-2 w-4 h-4" />Back</Button>
                            <Button onClick={nextStep} size="lg">Next<ChevronRight className="ml-2 w-4 h-4" /></Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 3: Validation */}
                {currentStep === 3 && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Shield className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Data Validation</CardTitle>
                                    <CardDescription>Checking your data before analysis</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                {dataValidation.map((check, idx) => (
                                    <div key={idx} className={`flex items-start gap-4 p-4 rounded-xl transition-colors ${
                                        check.passed ? 'bg-primary/5' : 'bg-amber-50/50 dark:bg-amber-950/20'
                                    }`}>
                                        {check.passed ? (
                                            <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                        ) : (
                                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                        )}
                                        <div>
                                            <p className={`font-medium text-sm ${check.passed ? 'text-foreground' : 'text-amber-700 dark:text-amber-300'}`}>
                                                {check.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-sky-50 dark:bg-sky-950/20 rounded-xl">
                                <Info className="w-5 h-5 text-sky-600 shrink-0" />
                                <p className="text-sm text-muted-foreground">
                                    Descriptive statistics work with any data. Missing values will be automatically excluded.
                                </p>
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

                {/* Step 4: Summary - Business Friendly */}
                {currentStep === 4 && results && summaryStats && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Result Summary</CardTitle>
                                    <CardDescription>What your data is telling you</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="rounded-xl p-6 space-y-4 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                <h3 className="font-semibold text-lg flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-primary" />
                                    Key Findings
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <span className="font-bold text-primary">•</span>
                                        <p className="text-sm">
                                            You analyzed <strong>{selectedVars.length} variables</strong> across <strong>{data.length} records</strong>.
                                            {groupByVar && <> Results are split by <strong>{groupByVar}</strong>.</>}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="font-bold text-primary">•</span>
                                        <p className="text-sm">
                                            {summaryStats.totalMissing === 0 
                                                ? "Your data is complete — no missing values found!"
                                                : `Found ${summaryStats.totalMissing} missing values. These were excluded from calculations.`}
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <span className="font-bold text-primary">•</span>
                                        <p className="text-sm">
                                            {summaryStats.hasSkewedData 
                                                ? "Some variables are skewed — the median may be more representative than the mean."
                                                : "Data appears reasonably balanced — mean and median should be similar."}
                                        </p>
                                    </div>
                                    {summaryStats.hasOutliers && (
                                        <div className="flex items-start gap-3">
                                            <span className="font-bold text-amber-600">•</span>
                                            <p className="text-sm">
                                                <strong className="text-amber-600">Potential outliers detected</strong> — check the visualizations for unusual values.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-6 h-6 text-primary" />
                                    <div>
                                        <p className="font-semibold">Data Overview Complete</p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            You now have a baseline understanding of your data. Use these statistics to inform your next analysis steps.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Records</p>
                                                <Hash className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{data.length}</p>
                                            <p className="text-xs text-muted-foreground">Total observations</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Variables</p>
                                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">{selectedVars.length}</p>
                                            <p className="text-xs text-muted-foreground">{summaryStats.numericVars.length} num, {summaryStats.categoricalVars.length} cat</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Missing</p>
                                                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className={`text-2xl font-semibold ${summaryStats.totalMissing > 0 ? 'text-amber-600' : ''}`}>
                                                {summaryStats.totalMissing}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{summaryStats.totalMissing === 0 ? 'Complete data' : 'Values missing'}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="p-6">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-muted-foreground">Data Quality</p>
                                                <Target className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <p className="text-2xl font-semibold">
                                                {summaryStats.totalMissing === 0 && !summaryStats.hasOutliers ? 'Good' : summaryStats.hasOutliers ? 'Check' : 'OK'}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{summaryStats.hasOutliers ? 'Review outliers' : 'Ready for analysis'}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="flex items-center justify-center gap-1 py-2">
                                <span className="text-sm text-muted-foreground mr-2">Data Quality:</span>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <span key={star} className={`text-lg ${
                                        (summaryStats.totalMissing === 0 && !summaryStats.hasOutliers && star <= 5) ||
                                        (summaryStats.totalMissing === 0 && star <= 4) ||
                                        (!summaryStats.hasOutliers && star <= 3) ||
                                        star <= 2
                                            ? 'text-amber-400' 
                                            : 'text-gray-300 dark:text-gray-600'
                                    }`}>★</span>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-end">
                            <Button onClick={nextStep} size="lg">
                                Why This Conclusion?<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 5: Reasoning - Business Friendly */}
                {currentStep === 5 && results && summaryStats && (
                    <Card className="border-0 shadow-lg">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Lightbulb className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle>Why This Conclusion?</CardTitle>
                                    <CardDescription>Understanding what these numbers mean for you</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">1</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">What&apos;s &quot;Typical&quot; in Your Data?</h4>
                                        <p className="text-sm text-muted-foreground">
                                            The <strong className="text-foreground">mean</strong> (average) and <strong className="text-foreground">median</strong> (middle value) show what&apos;s normal.
                                            If they&apos;re close together, your data is balanced. If they&apos;re different, some extreme values are pulling the average.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">2</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">How Spread Out Is It?</h4>
                                        <p className="text-sm text-muted-foreground">
                                            The <strong className="text-foreground">standard deviation</strong> tells you if values cluster tightly around the average or spread widely.
                                            Small = consistent data. Large = high variability.
                                            The <strong className="text-foreground">range</strong> (min to max) shows the full span.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">3</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">Any Unusual Patterns?</h4>
                                        <p className="text-sm text-muted-foreground">
                                            {summaryStats.hasSkewedData 
                                                ? <>Some of your data is <strong className="text-foreground">skewed</strong> — more values are bunched on one side. In these cases, the median is often more useful than the mean.</>
                                                : <>Your data appears <strong className="text-foreground">balanced</strong> — values are distributed fairly evenly around the center.</>}
                                            {summaryStats.hasOutliers && <> There may be <strong className="text-foreground">outliers</strong> — unusually high or low values worth investigating.</>}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-muted/30 rounded-xl p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold">4</div>
                                    <div>
                                        <h4 className="font-semibold mb-1">What About Categories?</h4>
                                        <p className="text-sm text-muted-foreground">
                                            For categorical data, we count how often each option appears. The <strong className="text-foreground">mode</strong> is the most common value.
                                            This helps you understand what&apos;s dominant in your data.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl p-5 border bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
                                <h4 className="font-semibold mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-primary" />
                                    Bottom Line: You Now Know Your Data
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                    With these statistics, you can make informed decisions: set realistic targets, identify unusual cases, 
                                    and choose the right analysis methods. This is your data&apos;s story in numbers.
                                </p>
                            </div>

                            <div className="bg-muted/20 rounded-xl p-4">
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" />Quick Reference
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                    <div className="text-center p-2 bg-background rounded-lg">
                                        <p className="font-medium">Mean</p>
                                        <p className="text-muted-foreground">Average value</p>
                                    </div>
                                    <div className="text-center p-2 bg-background rounded-lg">
                                        <p className="font-medium">Median</p>
                                        <p className="text-muted-foreground">Middle value</p>
                                    </div>
                                    <div className="text-center p-2 bg-background rounded-lg">
                                        <p className="font-medium">Std Dev</p>
                                        <p className="text-muted-foreground">Spread/variation</p>
                                    </div>
                                    <div className="text-center p-2 bg-background rounded-lg">
                                        <p className="font-medium">Mode</p>
                                        <p className="text-muted-foreground">Most common</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 flex justify-between">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                            <Button onClick={nextStep} size="lg">
                                View Full Statistics<ChevronRight className="ml-2 w-4 h-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {/* Step 6: Full Statistics */}
                {currentStep === 6 && results && (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-lg font-semibold">Full Statistical Details</h2>
                                <p className="text-sm text-muted-foreground">Complete technical report</p>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline">
                                        <Download className="mr-2 h-4 w-4" />Export<ChevronDown className="ml-2 h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel>Download as</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleDownloadCSV}>
                                        <FileSpreadsheet className="mr-2 h-4 w-4" />CSV Spreadsheet
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadPNG} disabled={isDownloading}>
                                        {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                                        PNG Image
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDownloadDOCX}>
                                        <FileText className="mr-2 h-4 w-4" />Word Document
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setPythonCodeModalOpen(true)}>
                                        <Code className="mr-2 h-4 w-4" />Python Code
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled className="text-muted-foreground">
                                        <FileText className="mr-2 h-4 w-4" />PDF Report<Badge variant="outline" className="ml-auto text-xs">Soon</Badge>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div ref={resultsRef} data-results-container className="space-y-4 bg-background p-4 rounded-lg">
                            <div className="text-center py-4 border-b">
                                <h2 className="text-2xl font-bold">Descriptive Statistics Report</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {selectedVars.length} Variables | {data.length} Observations | {groupByVar ? `Grouped by ${groupByVar} | ` : ''}{new Date().toLocaleDateString()}
                                </p>
                            </div>

                            <Tabs defaultValue="summary" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="summary">Summary Tables</TabsTrigger>
                                    <TabsTrigger value="individual">Individual Analysis</TabsTrigger>
                                </TabsList>
                                <TabsContent value="summary" className="mt-4">
                                    <SummaryTable 
                                        results={results} 
                                        selectedVars={selectedVars}
                                        numericHeaders={numericHeaders}
                                        categoricalHeaders={categoricalHeaders}
                                        groupByVar={groupByVar}
                                    />
                                </TabsContent>
                                <TabsContent value="individual" className="mt-4 space-y-4">
                                    {selectedVars.map(header => {
                                        const result = results[header];
                                        if (!result || result.error) return (
                                            <Alert key={header} variant="destructive">
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertTitle>Error for: {header}</AlertTitle>
                                                <AlertDescription>{result?.error || 'Unknown error'}</AlertDescription>
                                            </Alert>
                                        );
                                        return <AnalysisDisplay key={header} result={result} varName={header} />;
                                    })}
                                </TabsContent>
                            </Tabs>
                        </div>

                        <div className="mt-4 flex justify-start">
                            <Button variant="ghost" onClick={prevStep}>
                                <ChevronLeft className="mr-2 w-4 h-4" />Back
                            </Button>
                        </div>
                    </>
                )}
            </div>

            {/* Python Code Modal */}
            <PythonCodeModal 
                isOpen={pythonCodeModalOpen}
                onClose={() => setPythonCodeModalOpen(false)}
                codeUrl={PYTHON_CODE_URL}
            />

        </div>
    );
}