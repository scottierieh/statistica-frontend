
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AlertTriangle, HelpCircle, MoveRight, Settings, FileSearch, Filter } from 'lucide-react';
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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const example = exampleDatasets.find(d => d.analysisTypes.includes('stats'));
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Filter size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Outlier Detection</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Identify data points that deviate significantly from other observations using Z-score and IQR methods.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Detect Outliers?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Outliers can significantly affect statistical analyses and machine learning models, leading to biased results and poor performance. Identifying them is a crucial step in data cleaning and preparation. This tool helps you find these unusual data points using two common methods.
                        </p>
                    </div>
                    {example && (
                        <div className="flex justify-center">
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(example)}>
                                <example.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{example.name}</h4>
                                    <p className="text-xs text-muted-foreground">{example.description}</p>
                                </div>
                            </Card>
                        </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Methods Used</h3>
                            <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Z-score:</strong> Measures how many standard deviations a data point is from the mean. A Z-score greater than 3 (or less than -3) is typically considered an outlier. Best for normally distributed data.
                                </li>
                                <li>
                                    <strong>IQR (Interquartile Range):</strong> A robust method that is less sensitive to extreme values. It defines outliers as points that fall below Q1 - 1.5*IQR or above Q3 + 1.5*IQR.
                                </li>
                            </ul>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Box Plot:</strong> The primary visualization. Points plotted individually beyond the "whiskers" of the box plot are identified as outliers by the IQR method.</li>
                                <li><strong>Outlier Tables:</strong> The tables provide the exact index and value of the data points flagged as outliers by each method, allowing for easy inspection and removal if necessary.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
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

    if (view === 'intro' || !canRun) {
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
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label>Variables to Check</Label>
                        <ScrollArea className="h-40 border rounded-lg p-4">
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
        </div>
    );
}

