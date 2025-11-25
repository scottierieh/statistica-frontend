'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AlertTriangle, HelpCircle, MoveRight, Settings, FileSearch, Filter, BookOpen, CheckCircle, Target, Activity, Zap } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface OutlierResult {
    z_score_outliers: { index: number, value: number, z_score: number }[];
    iqr_outliers: { index: number, value: number }[];
    summary: {
        total_count: number;
        z_score_count: number;
        iqr_count: number;
    };
    plot: string;
}

interface FullAnalysisResponse {
    results: { [variable: string]: OutlierResult | { error: string } };
}

// Overview component with clean design
const OutlierOverview = ({ selectedVars, data }: any) => {
    const items = useMemo(() => {
        const overview = [];
        
        // Variable selection status
        if (selectedVars.length === 0) {
            overview.push('Select at least one numeric variable to check for outliers');
        } else if (selectedVars.length === 1) {
            overview.push(`Checking 1 variable: ${selectedVars[0]}`);
        } else {
            overview.push(`Checking ${selectedVars.length} variables: ${selectedVars.slice(0, 3).join(', ')}${selectedVars.length > 3 ? '...' : ''}`);
        }

        // Sample size
        const n = data.length;
        if (n < 10) {
            overview.push(`Sample size: ${n} observations (⚠ Very small - outlier detection unreliable)`);
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
        
        // Methods
        overview.push('Methods: Z-score (|Z| > 3) and IQR (Q1-1.5×IQR to Q3+1.5×IQR)');
        overview.push('Z-score works best for normally distributed data');

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
    const example = exampleDatasets.find(d => d.analysisTypes.includes('stats'));
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Filter className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Outlier Detection</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Identify data points that deviate significantly from the norm
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Z-Score Method</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Find points more than 3 standard deviations from mean
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">IQR Method</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Robust detection using interquartile range
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Zap className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Data Quality</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Improve analysis by identifying unusual values
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
                            Use outlier detection to identify unusual data points that could be errors, rare events, or 
                            special cases requiring separate analysis. Outliers can significantly affect statistical 
                            analyses and machine learning models, so detecting them is crucial for data quality and 
                            choosing appropriate analysis methods.
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
                                        <span><strong>Data type:</strong> Numeric continuous variables</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Sample size:</strong> At least 10 observations</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Methods:</strong> Z-score for normal, IQR for skewed data</span>
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
                                        <span><strong>Z-score:</strong> |Z| &gt; 3 indicates extreme values</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>IQR:</strong> Points beyond box plot whiskers</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Action:</strong> Investigate before removing outliers</span>
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

export default function OutlierDetectionPage({ data, numericHeaders, onLoadExample }: { data: DataSet; numericHeaders: string[]; onLoadExample: (e: any) => void }) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [selectedVars, setSelectedVars] = useState<string[]>(numericHeaders);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

    useEffect(() => {
        setSelectedVars(numericHeaders);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    const handleVarSelectionChange = (header: string, checked: boolean) => {
        setSelectedVars(prev => checked ? [...prev, header] : prev.filter(v => v !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (selectedVars.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select at least one numeric variable.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/outlier-detection', {
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
            toast({ title: 'Analysis Complete', description: 'Outlier detection has been performed.' });

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

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Outlier Detection Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select variables to check for unusual values.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label>Variables to Check</Label>
                        <ScrollArea className="h-40 border rounded-lg p-4 mt-2">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {numericHeaders.map(header => (
                                    <div key={header} className="flex items-center space-x-2">
                                        <Checkbox id={`var-${header}`} checked={selectedVars.includes(header)} onCheckedChange={(checked) => handleVarSelectionChange(header, !!checked)} />
                                        <label htmlFor={`var-${header}`} className="text-sm font-medium">{header}</label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    
                    {/* Overview component */}
                    <OutlierOverview 
                        selectedVars={selectedVars}
                        data={data}
                    />
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || selectedVars.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2"/>Detect Outliers</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Skeleton className="h-96 w-full" />}
            
            {analysisResult && (
                <div className="space-y-4">
                    {Object.entries(analysisResult.results).map(([variable, result]) => (
                         "error" in result ? (
                            <Card key={variable}><CardHeader><CardTitle>{variable}</CardTitle></CardHeader><CardContent><p className="text-destructive">{result.error}</p></CardContent></Card>
                         ) : (
                            <Card key={variable}>
                                <CardHeader><CardTitle>{variable}</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <Image src={`data:image/png;base64,${result.plot}`} alt={`Box plot for ${variable}`} width={600} height={400} className="w-full rounded-md border"/>
                                        </div>
                                        <div className="space-y-4">
                                             <Alert>
                                                <AlertTriangle className="h-4 w-4" />
                                                <AlertTitle>Summary</AlertTitle>
                                                <AlertDescription>
                                                    Found <strong>{result.summary.z_score_count}</strong> outliers using the Z-score method and <strong>{result.summary.iqr_count}</strong> outliers using the IQR method.
                                                </AlertDescription>
                                            </Alert>
                                             <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <h4 className="font-semibold mb-2">Z-Score Outliers (|Z| &gt; 3)</h4>
                                                    <ScrollArea className="h-48 border rounded-md">
                                                        <Table>
                                                            <TableHeader><TableRow><TableHead>Value</TableHead><TableHead className="text-right">Z-Score</TableHead></TableRow></TableHeader>
                                                            <TableBody>
                                                                {result.z_score_outliers.map(o => <TableRow key={o.index}><TableCell>{o.value.toFixed(2)}</TableCell><TableCell className="text-right font-mono">{o.z_score.toFixed(2)}</TableCell></TableRow>)}
                                                                {result.z_score_outliers.length === 0 && <TableRow><TableCell colSpan={2} className="text-center">None</TableCell></TableRow>}
                                                            </TableBody>
                                                        </Table>
                                                    </ScrollArea>
                                                </div>
                                                 <div>
                                                    <h4 className="font-semibold mb-2">IQR Outliers</h4>
                                                    <ScrollArea className="h-48 border rounded-md">
                                                        <Table>
                                                            <TableHeader><TableRow><TableHead>Value</TableHead></TableRow></TableHeader>
                                                            <TableBody>
                                                                {result.iqr_outliers.map(o => <TableRow key={o.index}><TableCell>{o.value.toFixed(2)}</TableCell></TableRow>)}
                                                                {result.iqr_outliers.length === 0 && <TableRow><TableCell className="text-center">None</TableCell></TableRow>}
                                                            </TableBody>
                                                        </Table>
                                                    </ScrollArea>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                         )
                    ))}
                </div>
            )}
            
            {!analysisResult && !isLoading && (
                <div className="text-center text-muted-foreground py-10">
                    <Filter className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2">Select variables and click 'Detect Outliers' to identify unusual values.</p>
                </div>
            )}
        </div>
    );
}