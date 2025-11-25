'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, BarChart, AlertTriangle, Lightbulb, CheckCircle, Bot, Zap, HelpCircle, MoveRight, Settings, FileSearch, Handshake, TestTube, Users, BookOpen, PieChart, Grid3x3 } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface FrequencyTableItem {
    Value: string | number;
    Frequency: number;
    Percentage: number;
    'Cumulative Percentage': number;
}

interface Insight {
    type: 'warning' | 'info';
    title: string;
    description: string;
}

interface VariableResult {
    table: FrequencyTableItem[];
    summary: {
        total_count: number;
        unique_categories: number;
        mode: string | number;
        entropy: number;
        max_entropy: number;
    };
    insights?: Insight[];
    recommendations?: string[];
    plot: string;
    error?: string;
}

interface FullAnalysisResponse {
    results: { [key: string]: VariableResult };
}

// Overview component with clean design
const FrequencyOverview = ({ selectedVars, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (selectedVars.length === 0) {
            overview.push('Select at least one categorical variable to analyze');
        } else if (selectedVars.length === 1) {
            overview.push(`Analyzing 1 variable: ${selectedVars[0]}`);
        } else {
            overview.push(`Analyzing ${selectedVars.length} variables: ${selectedVars.slice(0, 3).join(', ')}${selectedVars.length > 3 ? '...' : ''}`);
        }

        // Sample size
        const n = data.length;
        if (n < 10) {
            overview.push(`Sample size: ${n} observations (⚠ Very small)`);
        } else if (n < 30) {
            overview.push(`Sample size: ${n} observations (Small)`);
        } else if (n < 100) {
            overview.push(`Sample size: ${n} observations (Moderate)`);
        } else {
            overview.push(`Sample size: ${n} observations (Good)`);
        }

        // Check for missing values
        const missingCount = selectedVars.reduce((count: number, varName: string) => {
            return count + data.filter((row: any) => row[varName] == null || row[varName] === '').length;
        }, 0);
        
        if (missingCount > 0) {
            overview.push(`⚠ ${missingCount} missing values will be excluded`);
        }

        // Check category counts
        selectedVars.forEach((varName: string) => {
            const uniqueValues = new Set(data.map((row: any) => row[varName]).filter((v: any) => v != null && v !== ''));
            const uniqueCount = uniqueValues.size;
            
            if (uniqueCount > 20) {
                overview.push(`⚠ ${varName} has ${uniqueCount} categories (may be hard to interpret)`);
            }
        });
        
        // Analysis type
        overview.push('Generating frequency tables and bar charts for each variable');

        return overview;
    }, [selectedVars, data]);

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
    const freqExample = exampleDatasets.find(d => d.id === 'crosstab');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <BarChart className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Frequency Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Examine the distribution of categorical variables
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Grid3x3 className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Count & Proportion</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    See how many times each category appears in your data
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <PieChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Visual Distribution</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Bar charts make it easy to compare category frequencies
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Users className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Mode Detection</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identify the most common values in your dataset
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
                            Use frequency analysis as a first step in exploring categorical data. It helps you understand 
                            the composition of your sample, identify the most and least common categories, spot data entry 
                            errors, and check for imbalanced distributions before running more complex analyses.
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
                                        <span><strong>Data type:</strong> One or more categorical variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Categories:</strong> Works best with manageable number</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample:</strong> Any size (10+ recommended)</span>
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
                                        <span><strong>Frequency:</strong> Raw count of each category</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Percentage:</strong> Proportion of total sample</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Mode:</strong> Most frequently occurring value</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {freqExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(freqExample)} size="lg">
                                <Users className="mr-2 h-5 w-5" />
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};


interface FrequencyAnalysisPageProps {
    data: DataSet;
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function FrequencyAnalysisPage({ data, categoricalHeaders, onLoadExample }: FrequencyAnalysisPageProps) {
    const { toast } = useToast();
    const [selectedVars, setSelectedVars] = useState<string[]>(categoricalHeaders);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [view, setView] = useState('intro');

    const canRun = useMemo(() => data.length > 0 && categoricalHeaders.length > 0, [data, categoricalHeaders]);

    useEffect(() => {
        setSelectedVars(categoricalHeaders);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, categoricalHeaders, canRun]);
    
    const handleVarSelectionChange = (header: string, checked: boolean) => {
        setSelectedVars(prev => checked ? [...prev, header] : prev.filter(v => v !== header));
    };

    const runAnalysis = useCallback(async () => {
        if (selectedVars.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least one categorical variable.' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/frequency', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, variables: selectedVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);

            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({variant: 'destructive', title: 'Analysis Error', description: e.message})
        } finally {
            setIsLoading(false);
        }

    }, [data, selectedVars, toast]);
    
    if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    const renderResults = () => {
        if (!analysisResult) return null;
        return (
            <div className="space-y-8">
                {selectedVars.map(header => {
                    if(!analysisResult.results[header] || analysisResult.results[header].error) {
                        return (
                             <Card key={header}>
                                <CardHeader><CardTitle>{header}</CardTitle></CardHeader>
                                <CardContent>
                                    <Alert variant="destructive">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Analysis Error</AlertTitle>
                                        <AlertDescription>{analysisResult.results[header]?.error || "An unknown error occurred."}</AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>
                        )
                    }
                    const result = analysisResult.results[header];
                    return (
                        <Card key={header}>
                            <CardHeader>
                                <CardTitle className="font-headline">Results for: {header}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid lg:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                         <Card>
                                            <CardHeader className="pb-2"><CardTitle className="text-lg">Summary</CardTitle></CardHeader>
                                            <CardContent>
                                                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                                    <dt className="text-muted-foreground">Total Count</dt>
                                                    <dd className="font-mono">{result.summary.total_count}</dd>
                                                    <dt className="text-muted-foreground">Unique Categories</dt>
                                                    <dd className="font-mono">{result.summary.unique_categories}</dd>
                                                    <dt className="text-muted-foreground">Mode</dt>
                                                    <dd className="font-mono">{String(result.summary.mode)}</dd>
                                                </dl>
                                            </CardContent>
                                        </Card>
                                        {result.insights && result.insights.length > 0 && (
                                            <Card>
                                                <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary" />Key Insights</CardTitle></CardHeader>
                                                <CardContent>
                                                    <ul className="space-y-2 text-sm list-disc pl-4">
                                                        {result.insights.map((insight, i) => <li key={i}>{insight.description}</li>)}
                                                    </ul>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                    <div>
                                        <img 
                                            src={result.plot}
                                            alt={`Bar chart for ${header}`}
                                            className="w-full rounded-md border"
                                        />
                                    </div>
                                </div>
                                <Card>
                                    <CardHeader className="pb-2"><CardTitle className="text-lg">Frequency Table</CardTitle></CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-64">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Value</TableHead>
                                                        <TableHead className="text-right">Frequency</TableHead>
                                                        <TableHead className="text-right">%</TableHead>
                                                        <TableHead className="text-right">Cumulative %</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {result.table.map((row, i) => (
                                                        <TableRow key={i}>
                                                            <TableCell>{String(row.Value)}</TableCell>
                                                            <TableCell className="text-right">{row.Frequency}</TableCell>
                                                            <TableCell className="text-right">{row.Percentage.toFixed(1)}%</TableCell>
                                                            <TableCell className="text-right">{row['Cumulative Percentage'].toFixed(1)}%</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                 <div className="flex justify-between items-center">
                    <CardTitle className="font-headline">Frequency Analysis Setup</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                </div>
                <CardDescription>Select one or more categorical variables to analyze.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                    <div>
                        <Label>Categorical Variables</Label>
                        <ScrollArea className="h-40 border rounded-lg p-4 mt-2">
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {categoricalHeaders.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`var-${h}`} 
                                            onCheckedChange={(checked) => handleVarSelectionChange(h, !!checked)} 
                                            checked={selectedVars.includes(h)} 
                                        />
                                        <Label htmlFor={`var-${h}`} className="font-medium">{h}</Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    
                    {/* Overview component */}
                    <FrequencyOverview 
                        selectedVars={selectedVars}
                        data={data}
                    />
              </CardContent>
              <CardFooter className="flex justify-end">
                   <Button onClick={runAnalysis} disabled={isLoading || selectedVars.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Running...</> : <><Zap className="mr-2 h-4 w-4"/>Run Analysis</>}
                    </Button>
              </CardFooter>
            </Card>

            {isLoading && (
                <Card>
                    <CardContent className="p-6">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <p className="text-muted-foreground">Running analysis...</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {analysisResult ? renderResults() : (
                 !isLoading && (
                    <div className="text-center text-muted-foreground py-10">
                        <BarChart className="mx-auto h-12 w-12 text-gray-400"/>
                        <p className="mt-2">Select variables and click 'Run Analysis' to see the frequency distribution.</p>
                    </div>
                )
            )}
        </div>
    );
}

