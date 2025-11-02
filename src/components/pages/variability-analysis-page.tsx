
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, AlertTriangle, Layers, HelpCircle, MoveRight, Settings, FileSearch, BarChart } from 'lucide-react';
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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'ipa-restaurant');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <CardTitle className="font-headline text-4xl font-bold">Variability Analysis</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Compare the dispersion and consistency of multiple numeric variables.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Variability Analysis?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Understanding variability is key to assessing the consistency and predictability of a process or dataset. This analysis provides several measures of dispersion, helping you identify which variables are more stable and which have more diverse values. It's particularly useful for comparing variables on different scales using the Coefficient of Variation (CV).
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {example && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(example)}>
                                <example.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{example.name}</h4>
                                    <p className="text-xs text-muted-foreground">{example.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Select Variables:</strong> Choose two or more numeric variables from your dataset to compare their variability.</li>
                                <li><strong>Run Analysis:</strong> The tool will calculate the Range, Interquartile Range (IQR), and Coefficient of Variation (CV) for each selected variable.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Range:</strong> The difference between the maximum and minimum values. Sensitive to outliers.</li>
                                <li><strong>Interquartile Range (IQR):</strong> The range of the middle 50% of the data. More robust to outliers than the range.</li>
                                <li><strong>Coefficient of Variation (CV):</strong> The ratio of the standard deviation to the mean, expressed as a percentage. It's a standardized measure of dispersion, perfect for comparing variables with different units or scales. A lower CV indicates more consistency.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                </CardFooter>
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
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult?.results;

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Variability Analysis</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Compare measures of dispersion across multiple variables.</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || selectedVars.length < 2}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Running...</> : <><Sigma className="mr-2"/>Analyze Variability</>}
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
        </div>
    );
}
