'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AlertTriangle, Layers, HelpCircle, MoveRight, Settings, FileSearch, BarChart, BookOpen, CheckCircle, Zap, Activity, TrendingUp, Target } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface VariabilityResult {
    variable: string;
    range: number;
    iqr: number;
    cv: number;
}

interface FullAnalysisResponse {
    results: VariabilityResult[];
    interpretation: string;
}

// Overview component with clean design
const VariabilityOverview = ({ selectedVars, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (selectedVars.length === 0) {
            overview.push('Select at least 2 variables to compare variability');
        } else if (selectedVars.length === 1) {
            overview.push('⚠ Only 1 variable selected (need at least 2 for comparison)');
        } else {
            overview.push(`Comparing ${selectedVars.length} variables: ${selectedVars.slice(0, 3).join(', ')}${selectedVars.length > 3 ? '...' : ''}`);
        }

        // Sample size
        const n = data.length;
        if (n < 10) {
            overview.push(`Sample size: ${n} observations (⚠ Very small - measures unreliable)`);
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
        
        // Measures
        overview.push('Calculating Range, IQR, and Coefficient of Variation (CV)');
        overview.push('Lower CV indicates more consistency relative to mean');

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
    const example = exampleDatasets.find(d => d.id === 'ipa-restaurant');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Activity className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Variability Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Compare dispersion and consistency across multiple variables
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Range & IQR</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Measure spread with range and interquartile range
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Coefficient of Variation</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Standardized measure for comparing different scales
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Consistency Check</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Identify which variables are most stable
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
                            Use variability analysis to assess the consistency and predictability of different variables. 
                            It's especially useful for comparing variables on different scales using the Coefficient of 
                            Variation (CV). Lower variability indicates more predictable, stable processes, while higher 
                            variability suggests more diverse or inconsistent values.
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
                                        <span><strong>Sample size:</strong> At least 10 observations</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Comparison:</strong> Use CV for different scales</span>
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
                                        <span><strong>Range:</strong> Max minus min (sensitive to outliers)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>IQR:</strong> Middle 50% spread (robust measure)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>CV:</strong> Lower = more consistent</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {example && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(example)} size="lg">
                                {example.icon && <example.icon className="mr-2 h-5 w-5" />}
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};


interface VariabilityAnalysisPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function VariabilityAnalysisPage({ data, numericHeaders, onLoadExample }: VariabilityAnalysisPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [selectedVars, setSelectedVars] = useState<string[]>(numericHeaders);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    useEffect(() => {
        setSelectedVars(numericHeaders);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    const handleVarSelectionChange = (header: string, checked: boolean) => {
        setSelectedVars(prev => checked ? [...prev, header] : prev.filter(v => v !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (selectedVars.length < 2) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least two numeric variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/variability', {
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
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
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

    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Variability Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Compare measures of dispersion across multiple variables.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Variables to Analyze</Label>
                        <ScrollArea className="h-40 border rounded-lg p-4 mt-2">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {numericHeaders.map(header => (
                                    <div key={header} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`var-${header}`}
                                            checked={selectedVars.includes(header)}
                                            onCheckedChange={(checked) => handleVarSelectionChange(header, !!checked)}
                                        />
                                        <label htmlFor={`var-${header}`} className="text-sm font-medium leading-none">{header}</label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    
                    {/* Overview component */}
                    <VariabilityOverview 
                        selectedVars={selectedVars}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || selectedVars.length < 2}>
                       {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Running...</> : <><Zap className="mr-2 h-4 w-4"/>Run Analysis</>}
                                                                                              
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>}

            {results && (
                <Card>
                    <CardHeader>
                        <CardTitle>Analysis Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Variable</TableHead>
                                    <TableHead className="text-right">Range</TableHead>
                                    <TableHead className="text-right">Interquartile Range (IQR)</TableHead>
                                    <TableHead className="text-right">Coefficient of Variation (CV)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.map(res => (
                                    <TableRow key={res.variable}>
                                        <TableCell>{res.variable}</TableCell>
                                        <TableCell className="text-right font-mono">{res.range.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono">{res.iqr.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-mono">{res.cv.toFixed(1)}%</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         <div className="mt-4 text-center text-sm text-muted-foreground p-4 border-t">
                            <p><strong>Coefficient of Variation (CV)</strong> = (Standard Deviation / Mean) × 100%. A lower CV indicates more consistency relative to the mean.</p>
                        </div>
                        {analysisResult?.interpretation && (
                            <Alert className="mt-4">
                                <AlertTriangle className="h-4 w-4"/>
                                <AlertTitle>Interpretation</AlertTitle>
                                <AlertDescription dangerouslySetInnerHTML={{ __html: analysisResult.interpretation.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}}/>
                            </Alert>
                        )}
                    </CardContent>
                </Card>
            )}
            
            {!results && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Activity className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select variables and click 'Analyze Variability' to compare dispersion.</p>
                </div>
            )}
        </div>
    );
}