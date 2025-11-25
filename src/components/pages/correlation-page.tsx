'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sigma, Loader2, BarChart, TrendingUp, Zap, Lightbulb, Bot, AlertTriangle, MessageSquareQuote, Link2, HelpCircle, MoveRight, Settings, FileSearch, Handshake, TestTube, Layers, Target, CheckCircle, BookOpen, Activity, Info, Grid3x3 } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '../ui/scroll-area';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

interface CorrelationResults {
  correlation_matrix: { [key: string]: { [key: string]: number } };
  p_value_matrix: { [key: string]: { [key: string]: number } };
  summary_statistics: {
    mean_correlation: number;
    median_correlation: number;
    std_dev: number;
    range: [number, number];
    significant_correlations: number;
    total_pairs: number;
  };
  strongest_correlations: {
    variable_1: string;
    variable_2: string;
    correlation: number;
    p_value: number;
    significant: boolean;
  }[];
  interpretation: {
    title: string;
    body: string;
  };
  pairs_plot?: string;
  heatmap_plot?: string;
  n_dropped?: number;
  dropped_rows?: number[];
}

// Statistical Summary Cards Component
const StatisticalSummaryCards = ({ results }: { results: CorrelationResults }) => {
    const significantRate = (results.summary_statistics.significant_correlations / results.summary_statistics.total_pairs) * 100;
    const hasSignificant = results.summary_statistics.significant_correlations > 0;
    const strongestCorr = results.strongest_correlations[0];
    
    const getCorrelationInterpretation = (r: number) => {
        const absR = Math.abs(r);
        if (absR >= 0.7) return "Strong";
        if (absR >= 0.4) return "Moderate";
        if (absR >= 0.2) return "Weak";
        return "Negligible";
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Mean Correlation Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Mean |r|
                            </p>
                            <BarChart className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {Math.abs(results.summary_statistics.mean_correlation).toFixed(3)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {getCorrelationInterpretation(results.summary_statistics.mean_correlation)}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Significant Pairs Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Significant Pairs
                            </p>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className={`text-2xl font-semibold ${!hasSignificant ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {results.summary_statistics.significant_correlations}/{results.summary_statistics.total_pairs}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {significantRate.toFixed(0)}% significant
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Strongest Correlation Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Strongest |r|
                            </p>
                            <Target className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            {strongestCorr ? Math.abs(strongestCorr.correlation).toFixed(3) : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {strongestCorr ? getCorrelationInterpretation(strongestCorr.correlation) : 'No correlations'}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Range Card */}
            <Card>
                <CardContent className="p-6">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">
                                Range
                            </p>
                            <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <p className="text-2xl font-semibold">
                            [{results.summary_statistics.range[0].toFixed(2)}, {results.summary_statistics.range[1].toFixed(2)}]
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Min to Max r
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

// Overview component with clean design
const CorrelationOverview = ({ selectedHeaders, groupVar, correlationMethod, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (selectedHeaders.length === 0) {
            overview.push('Select at least 2 variables for correlation analysis');
        } else if (selectedHeaders.length === 1) {
            overview.push('⚠ Only 1 variable selected (need at least 2)');
        } else {
            overview.push(`Analyzing ${selectedHeaders.length} variables: ${selectedHeaders.slice(0, 3).join(', ')}${selectedHeaders.length > 3 ? '...' : ''}`);
        }

        // Method info
        overview.push(`Method: ${correlationMethod.charAt(0).toUpperCase() + correlationMethod.slice(1)}`);
        
        // Group variable
        if (groupVar) {
            overview.push(`Grouped by: ${groupVar}`);
        }

        // Sample size warnings
        const n = data.length;
        if (n < 10) {
            overview.push(`Sample size: ${n} observations (⚠ Very small - correlations unreliable)`);
        } else if (n < 30) {
            overview.push(`Sample size: ${n} observations (⚠ Small - interpret with caution)`);
        } else if (n < 100) {
            overview.push(`Sample size: ${n} observations (Moderate)`);
        } else {
            overview.push(`Sample size: ${n} observations (Good)`);
        }

        // Number of pairs
        const numPairs = (selectedHeaders.length * (selectedHeaders.length - 1)) / 2;
        overview.push(`Will calculate ${numPairs} correlation coefficients`);
        
        // Helper function to check if value is missing
        const isMissing = (value: any) => {
            return value == null || value === '' || 
                   (typeof value === 'number' && isNaN(value)) ||
                   (typeof value === 'string' && value.toLowerCase() === 'nan');
        };
        
        // Missing value check
        if (data && data.length > 0 && selectedHeaders.length > 0) {
            const missingCount = data.filter((row: any) => 
                selectedHeaders.some(varName => isMissing(row[varName]))
            ).length;
            const validCount = data.length - missingCount;
            
            if (missingCount > 0) {
                overview.push(`⚠ Missing values: ${missingCount} rows will be excluded (${validCount} valid observations)`);
            } else {
                overview.push(`✓ No missing values detected`);
            }
        }
        
        // Method recommendations
        if (correlationMethod === 'pearson' && n < 30) {
            overview.push('⚠ Consider Spearman for small samples');
        }

        return overview;
    }, [selectedHeaders, groupVar, correlationMethod, data]);

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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const corrExample = exampleDatasets.find(d => d.id === 'iris');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Link2 className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Correlation Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Measure the strength and direction of relationships between variables
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Link2 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Relationship Strength</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Quantify how strongly variables are related (r from -1 to +1)
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <TestTube className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Multiple Methods</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Choose Pearson, Spearman, or Kendall based on your data
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Pattern Discovery</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identify which variables move together in your data
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
                            Use correlation analysis to explore relationships between numeric variables before building 
                            predictive models, understand which factors are associated, or identify redundant variables. 
                            Positive correlations mean variables increase together, negative correlations mean one increases 
                            as the other decreases, and correlations near zero indicate no linear relationship.
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
                                        <span><strong>Variables:</strong> Two or more numeric variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> At least 10 observations (30+ recommended)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Method:</strong> Pearson for linear, Spearman for monotonic</span>
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
                                        <span><strong>r near ±1:</strong> Strong linear relationship</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>r near 0:</strong> Weak or no linear relationship</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>P &lt; 0.05:</strong> Statistically significant correlation</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {corrExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(corrExample)} size="lg">
                                {corrExample.icon && <corrExample.icon className="mr-2 h-5 w-5" />}
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const StrongestCorrelationsChart = ({ data }: { data: CorrelationResults['strongest_correlations'] }) => {
    const chartData = data.map(item => ({
        name: `${item.variable_1.substring(0,10)} & ${item.variable_2.substring(0,10)}`,
        correlation: item.correlation
    })).reverse();
    
    const chartConfig = {
      correlation: {
        label: "Correlation",
        color: "hsl(var(--chart-1))"
      },
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Strongest Correlations</CardTitle>
                 <CardDescription>Top 10 strongest relationships found in the data.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={chartConfig} className="w-full h-[300px]">
                    <RechartsBarChart layout="vertical" data={chartData} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false}/>
                        <XAxis type="number" dataKey="correlation" domain={[-1, 1]}/>
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 10 }} />
                        <Tooltip content={<ChartTooltipContent />} cursor={{fill: 'hsl(var(--muted))'}} />
                        <ReferenceLine x={0} stroke="#666" />
                        <Bar dataKey="correlation">
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.correlation > 0 ? "hsl(var(--chart-2))" : "hsl(var(--chart-5))"} />
                            ))}
                        </Bar>
                    </RechartsBarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

interface CorrelationPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    onGenerateReport: (stats: any, viz: string | null) => void;
}

export default function CorrelationPage({ data, numericHeaders, categoricalHeaders, onLoadExample, onGenerateReport }: CorrelationPageProps) {
  const { toast } = useToast();
  const [view, setView] = useState('intro');
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>(numericHeaders.slice(0, 8));
  const [groupVar, setGroupVar] = useState<string | undefined>();
  const [results, setResults] = useState<CorrelationResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [correlationMethod, setCorrelationMethod] = useState<'pearson' | 'spearman' | 'kendall'>('pearson');

  const canRun = useMemo(() => {
    return data.length > 0 && numericHeaders.length >= 2;
  }, [data, numericHeaders]);

  useEffect(() => {
    setSelectedHeaders(numericHeaders.slice(0, 8));
    setGroupVar(undefined);
    setResults(null);
    setView(canRun ? 'main' : 'intro');
  }, [numericHeaders, data, canRun]);

  const handleSelectionChange = (header: string, checked: boolean) => {
    setSelectedHeaders(prev => 
      checked ? [...prev, header] : prev.filter(h => h !== header)
    );
  };
  
  const handleAnalysis = useCallback(async () => {
    if (selectedHeaders.length < 2) {
      toast({variant: 'destructive', title: 'Selection Error', description: "Please select at least two numeric variables for correlation analysis."});
      return;
    }
    setIsLoading(true);
    setResults(null);
    
    try {
        const response = await fetch('/api/analysis/correlation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data: data,
                variables: selectedHeaders,
                groupVar: groupVar,
                method: correlationMethod, 
            })
        });

        if (!response.ok) {
            const errorResult = await response.json();
            throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
        }
        
        const result: CorrelationResults = await response.json();
        setResults(result);

    } catch (e: any) {
        console.error('Analysis error:', e);
        toast({variant: 'destructive', title: 'Correlation Analysis Error', description: e.message || 'An unexpected error occurred.'})
        setResults(null);
    } finally {
        setIsLoading(false);
    }
  }, [data, selectedHeaders, groupVar, toast, correlationMethod]);
  
  if (!canRun && view === 'main') {
    return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
  }
    
  if (view === 'intro') {
    return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="font-headline">Correlation Analysis Setup</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
          </div>
          <CardDescription>Select variables and choose a correlation method.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
                 <div className="md:col-span-2">
                    <Label>Variables for Correlation</Label>
                    <ScrollArea className="h-40 border rounded-md p-4">
                    <div className="grid grid-cols-2 gap-4">
                        {numericHeaders.filter(h => h).map(header => (
                        <div key={header} className="flex items-center space-x-2">
                            <Checkbox
                            id={`corr-${header}`}
                            checked={selectedHeaders.includes(header)}
                            onCheckedChange={(checked) => handleSelectionChange(header, checked as boolean)}
                            />
                            <label htmlFor={`corr-${header}`} className="text-sm font-medium leading-none">
                            {header}
                            </label>
                        </div>
                        ))}
                    </div>
                    </ScrollArea>
                </div>
                <div className="space-y-4">
                    <div>
                        <Label>Method</Label>
                        <Select value={correlationMethod} onValueChange={(v) => setCorrelationMethod(v as any)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pearson">Pearson</SelectItem>
                                <SelectItem value="spearman">Spearman</SelectItem>
                                <SelectItem value="kendall">Kendall's Tau</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Group By (Optional)</Label>
                        <Select value={groupVar} onValueChange={(v) => setGroupVar(v === 'none' ? undefined : v)}>
                            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {categoricalHeaders.filter(h => h).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
            
            {/* Overview component */}
            <CorrelationOverview 
                selectedHeaders={selectedHeaders}
                groupVar={groupVar}
                correlationMethod={correlationMethod}
                data={data}
            />
        </CardContent>
         <CardFooter className="flex justify-end gap-2">
            {results && <Button variant="ghost" onClick={() => onGenerateReport(results, null)}><Bot className="mr-2"/>AI Report</Button>}
            <Button onClick={handleAnalysis} disabled={selectedHeaders.length < 2 || isLoading}>
                {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2"/> Run Analysis</>}
            </Button>
        </CardFooter>
      </Card>
      
      {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full" /></CardContent></Card>}

      {results && !isLoading && (
        <div className="space-y-4">
            {/* Data Quality Information */}
            {results.n_dropped !== undefined && results.n_dropped > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Data Quality</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Missing Values Detected</AlertTitle>
                            <AlertDescription>
                                <p className="mb-2">
                                    {results.n_dropped} row{results.n_dropped > 1 ? 's were' : ' was'} excluded from the analysis due to missing values.
                                </p>
                                {results.dropped_rows && results.dropped_rows.length > 0 && (
                                    <details className="mt-2">
                                        <summary className="cursor-pointer font-medium text-sm hover:underline">
                                            View excluded row indices (0-based)
                                        </summary>
                                        <div className="mt-2 p-2 bg-destructive/10 rounded text-xs font-mono">
                                            {results.dropped_rows.length <= 20 
                                                ? results.dropped_rows.join(', ')
                                                : `${results.dropped_rows.slice(0, 20).join(', ')} ... and ${results.dropped_rows.length - 20} more`
                                            }
                                        </div>
                                    </details>
                                )}
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}
            
            {/* Statistical Summary Cards */}
            <StatisticalSummaryCards results={results} />
            
            {/* Detailed Analysis - EXACTLY like ANCOVA/mediation */}
            {results.interpretation && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            Detailed Analysis
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {(() => {
                            const interpretation = results.interpretation;
                            const sections: { title: string; content: string[]; icon: any }[] = [];
                            
                            const lines = `${interpretation.title}\n\n${interpretation.body}`.split('\n').filter(l => l.trim());
                            let currentSection: typeof sections[0] | null = null;
                            
                            lines.forEach((line) => {
                                const trimmed = line.trim();
                                if (!trimmed) return;
                                
                                if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                                    const title = trimmed.replace(/\*\*/g, '').trim();
                                    
                                    let icon = Grid3x3;
                                    if (title.includes('Overall Analysis')) icon = Grid3x3;
                                    else if (title.includes('Statistical Insights')) icon = Info;
                                    else if (title.includes('Recommendations')) icon = TrendingUp;
                                    
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
                                
                                if (idx === 0) {
                                    gradientClass = 'bg-gradient-to-br from-primary/5 to-primary/10';
                                    borderClass = 'border-primary/40';
                                    iconBgClass = 'bg-primary/10';
                                    iconColorClass = 'text-primary';
                                    bulletColorClass = 'text-primary';
                                } else if (section.title.includes('Statistical Insights')) {
                                    gradientClass = 'bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10';
                                    borderClass = 'border-blue-300 dark:border-blue-700';
                                    iconBgClass = 'bg-blue-500/10';
                                    iconColorClass = 'text-blue-600 dark:text-blue-400';
                                    bulletColorClass = 'text-blue-600 dark:text-blue-400';
                                } else {
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

            {/* Visualizations - Side by Side */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* Heatmap */}
                {results.heatmap_plot && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Correlation Heatmap</CardTitle>
                            <CardDescription>Matrix showing correlation coefficients</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image 
                                src={results.heatmap_plot} 
                                alt="Correlation Heatmap" 
                                width={800} 
                                height={500} 
                                className="w-full rounded-md border" 
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Pairs Plot */}
                {results.pairs_plot ? (
                    <Card>
                        <CardHeader>
                            <CardTitle>Pairs Plot</CardTitle>
                            <CardDescription>Pairwise relationships between variables</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Image 
                                src={results.pairs_plot} 
                                alt="Pairs Plot" 
                                width={800} 
                                height={500} 
                                className="w-full rounded-md border" 
                            />
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Pairs Plot</CardTitle>
                            <CardDescription>Pairwise relationships between variables</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-center h-[500px]">
                            <p className="text-center text-muted-foreground">
                                Pairs plot could not be generated with this many variables
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Correlation Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Correlation Pairs Table</CardTitle>
                    <CardDescription>Pairwise correlations with confidence intervals and significance</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Variable 1</TableHead>
                                    <TableHead>Variable 2</TableHead>
                                    <TableHead className="text-right">Correlation (r)</TableHead>
                                    <TableHead className="text-right">p-value</TableHead>
                                    <TableHead className="text-right">Lower 95% CI</TableHead>
                                    <TableHead className="text-right">Upper 95% CI</TableHead>
                                    <TableHead className="text-center">Sig</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.strongest_correlations.map((pair, idx) => {
                                    const n = data.length - (results.n_dropped || 0);
                                    const r = pair.correlation;
                                    const z = 0.5 * Math.log((1 + r) / (1 - r)); // Fisher's z transformation
                                    const se = 1 / Math.sqrt(n - 3);
                                    const z_lower = z - 1.96 * se;
                                    const z_upper = z + 1.96 * se;
                                    const ci_lower = (Math.exp(2 * z_lower) - 1) / (Math.exp(2 * z_lower) + 1);
                                    const ci_upper = (Math.exp(2 * z_upper) - 1) / (Math.exp(2 * z_upper) + 1);
                                    
                                    return (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">{pair.variable_1}</TableCell>
                                            <TableCell className="font-medium">{pair.variable_2}</TableCell>
                                            <TableCell className="text-right font-mono">{r.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {pair.p_value < 0.001 ? '<.001' : pair.p_value.toFixed(3)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono">{ci_lower.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{ci_upper.toFixed(3)}</TableCell>
                                            <TableCell className="text-center">
                                                {pair.significant ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400">
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                        Yes
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline">No</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter>
                    <p className='text-sm text-muted-foreground'>
                        95% Confidence Intervals calculated using Fisher's z transformation. Significant correlations (p &lt; 0.05) highlighted in blue.
                    </p>
                </CardFooter>
            </Card>

            {/* Correlation Matrix Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Correlation Matrix</CardTitle>
                    <CardDescription>Full correlation matrix with p-values</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Variable</TableHead>
                                    {selectedHeaders.map(header => <TableHead key={header} className="text-right">{header}</TableHead>)}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedHeaders.map(rowHeader => (
                                    <TableRow key={rowHeader}>
                                        <TableHead>{rowHeader}</TableHead>
                                        {selectedHeaders.map(colHeader => {
                                            const corr = results.correlation_matrix[rowHeader]?.[colHeader];
                                            const pVal = results.p_value_matrix[rowHeader]?.[colHeader];
                                            const isSig = pVal !== undefined && pVal < 0.05;
                                            return (
                                                <TableCell key={colHeader} className={`text-right font-mono`}>
                                                    {corr !== undefined ? corr.toFixed(3) : 'N/A'}
                                                    <br/>
                                                    <span className="text-xs text-muted-foreground">
                                                        (p={pVal !== undefined ? pVal.toFixed(3) : 'N/A'})
                                                    </span>
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
                <CardFooter>
                    <p className='text-sm text-muted-foreground'>
                        Correlation coefficients with p-values in parentheses. Significant correlations (p &lt; 0.05) highlighted in blue.
                    </p>
                </CardFooter>
            </Card>
        </div>
      )}
      {!results && !isLoading && (
        <div className="text-center text-muted-foreground py-10">
          <Layers className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2">Select variables and click 'Run Analysis' to see the results.</p>
        </div>
      )}
    </div>
  );
}
