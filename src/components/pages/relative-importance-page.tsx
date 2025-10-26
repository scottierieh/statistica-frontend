
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Percent, HelpCircle, MoveRight, Settings, FileSearch, TrendingUp } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';

interface ImportanceResult {
    predictor: string;
    standardized_beta: number;
    semi_partial_r2: number;
    relative_weight_pct: number;
    rank: number;
}

interface FullAnalysisResponse {
    results: ImportanceResult[];
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const example = exampleDatasets.find(d => d.id === 'regression-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Percent size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Relative Importance Analysis</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Determine the true contribution of each predictor to your model's success, even when they are correlated.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Relative Importance Analysis?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            When predictors in a regression model are correlated, standard regression coefficients (betas) can be misleading indicators of importance. This analysis decomposes the total R-squared into parts attributable to each predictor, providing a more accurate and reliable measure of their relative influence on the outcome.
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
                                <li><strong>Dependent Variable (Y):</strong> The outcome variable you want to explain.</li>
                                <li><strong>Independent Variables (X):</strong> The set of predictor variables.</li>
                                <li><strong>Run Analysis:</strong> The tool will perform the necessary regressions to calculate the relative weights.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Relative Weight (%):</strong> This is the core metric. It represents each predictor's percentage contribution to the total R-squared. Higher values indicate greater importance.</li>
                                 <li><strong>Standardized Beta:</strong> The coefficient from a standard regression where all variables have been standardized. Useful for comparison but can be unreliable with correlated predictors.</li>
                                <li><strong>Semi-Partial R²:</strong> The unique contribution of each predictor to the total R-squared, after accounting for all other predictors.</li>
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


interface RelativeImportancePageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function RelativeImportancePage({ data, numericHeaders, onLoadExample }: RelativeImportancePageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dependentVar, setDependentVar] = useState<string | undefined>(numericHeaders[numericHeaders.length - 1]);
    const [independentVars, setIndependentVars] = useState<string[]>(numericHeaders.slice(0, numericHeaders.length - 1));
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const availableIVs = useMemo(() => numericHeaders.filter(h => h !== dependentVar), [numericHeaders, dependentVar]);
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    useEffect(() => {
        const defaultTarget = numericHeaders.length > 1 ? numericHeaders[numericHeaders.length - 1] : numericHeaders[0];
        setDependentVar(defaultTarget);
        setIndependentVars(numericHeaders.filter(h => h !== defaultTarget));
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    const handleIVChange = (header: string, checked: boolean) => {
        setIndependentVars(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || independentVars.length < 1) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a dependent variable and at least one independent variable.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch('/api/analysis/relative-importance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependent_var: dependentVar, independent_vars: independentVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Analysis failed');
            }
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, independentVars, toast]);

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
                         <CardTitle className="font-headline">Relative Importance Analysis</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Determine the relative contribution of each predictor to the overall R-squared.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                     <div>
                        <Label>Dependent Variable (Y)</Label>
                        <Select value={dependentVar} onValueChange={setDependentVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                        <Label>Independent Variables (X)</Label>
                        <ScrollArea className="h-32 border rounded-md p-4">
                            <div className="space-y-2">
                                {availableIVs.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`iv-${h}`} checked={independentVars.includes(h)} onCheckedChange={(c) => handleIVChange(h, c as boolean)} />
                                        <Label htmlFor={`iv-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !dependentVar || independentVars.length < 1}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-64 w-full"/></CardContent></Card>}

            {results && (
                <Card>
                    <CardHeader>
                        <CardTitle>Relative Importance Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Predictor</TableHead>
                                    <TableHead className="text-right">Standardized Beta</TableHead>
                                    <TableHead className="text-right">Semi-Partial R²</TableHead>
                                    <TableHead className="text-right">Relative Weight (%)</TableHead>
                                    <TableHead className="text-right">Rank</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {results.map(row => (
                                    <TableRow key={row.predictor}>
                                        <TableCell className="font-medium">{row.predictor}</TableCell>
                                        <TableCell className="text-right font-mono">{row.standardized_beta.toFixed(3)}</TableCell>
                                        <TableCell className="text-right font-mono">{row.semi_partial_r2.toFixed(3)}</TableCell>
                                        <TableCell className="text-right font-mono">{row.relative_weight_pct.toFixed(1)}%</TableCell>
                                        <TableCell className="text-right font-mono">{row.rank}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

