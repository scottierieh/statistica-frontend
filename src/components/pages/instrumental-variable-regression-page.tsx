
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Link2, HelpCircle, MoveRight, Settings, FileSearch, TrendingUp } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RegressionResult {
    model: string;
    coefficients: number[];
    std_errors: number[];
    t_statistics: number[];
    p_values: number[];
    variable_names: string[];
}
interface FullAnalysisResponse {
    ols: RegressionResult;
    tsls: RegressionResult;
    plot?: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const ivExample = exampleDatasets.find(d => d.id === 'regression-suite');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Link2 size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Instrumental Variable (IV) Regression</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Estimate causal relationships when controlled experiments are not feasible and standard regression would be biased due to endogeneity.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use IV Regression?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            When a predictor variable (X) is correlated with the error term in a regression, it leads to biased results. This is known as endogeneity. IV regression uses a third variable, the "instrument" (Z), which is correlated with X but not directly with the outcome (Y), to isolate the part of X that is exogenous and estimate its true causal effect on Y.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {ivExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(ivExample)}>
                                <ivExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{ivExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{ivExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Dependent Variable (Y):</strong> The final outcome variable.</li>
                                <li><strong>Endogenous Variable(s) (X):</strong> Predictors that are correlated with the error term.</li>
                                <li><strong>Exogenous Variable(s) (X):</strong> Predictors that are not correlated with the error term.</li>
                                <li><strong>Instrumental Variable(s) (Z):</strong> Variables that are correlated with the endogenous variables but do not directly affect the dependent variable.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>2SLS (Two-Stage Least Squares):</strong> This is the result from the IV regression. Compare its coefficients to the naive OLS model to see the effect of correcting for endogeneity.</li>
                                <li><strong>First-Stage F-statistic:</strong> Not yet implemented, but this tests if your instruments are strong enough. An F-statistic greater than 10 is a common rule of thumb.</li>
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


export default function InstrumentalVariableRegressionPage({ data, numericHeaders, onLoadExample }: { data: DataSet; numericHeaders: string[]; onLoadExample: (e: any) => void }) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [yCol, setYCol] = useState<string | undefined>();
    const [xEndogCols, setXEndogCols] = useState<string[]>([]);
    const [xExogCols, setXExogCols] = useState<string[]>([]);
    const [zCols, setZCols] = useState<string[]>([]);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 4, [data, numericHeaders]);

    useEffect(() => {
        if (canRun) {
            setYCol(numericHeaders[0]);
            setXEndogCols([numericHeaders[1]]);
            setXExogCols([numericHeaders[2]]);
            setZCols([numericHeaders[3]]);
            setView('main');
        } else {
            setView('intro');
        }
    }, [canRun, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        if (!yCol || xEndogCols.length === 0 || zCols.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select Y, at least one Endogenous X, and at least one Instrument Z.' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/instrumental-variable-regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, y_col: yCol, x_endog_cols: xEndogCols, x_exog_cols: xExogCols, z_cols: zCols })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'API error');
            }
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, yCol, xEndogCols, xExogCols, zCols, toast]);

    const renderResultsTable = (result: RegressionResult) => (
        <Card>
            <CardHeader><CardTitle>{result.model}</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>Variable</TableHead><TableHead>Coef.</TableHead><TableHead>Std.Err</TableHead><TableHead>t</TableHead><TableHead>p</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {result.variable_names.map((name, i) => (
                            <TableRow key={name}>
                                <TableCell>{name}</TableCell>
                                <TableCell>{result.coefficients[i]?.toFixed(4)}</TableCell>
                                <TableCell>{result.std_errors[i]?.toFixed(4)}</TableCell>
                                <TableCell>{result.t_statistics[i]?.toFixed(3)}</TableCell>
                                <TableCell>{result.p_values[i] < 0.001 ? '<.001' : result.p_values[i]?.toFixed(3)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );

    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                         <CardTitle className="font-headline">IV Regression Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <Label>Dependent (Y)</Label>
                        <Select value={yCol} onValueChange={v => setYCol(v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                        <Label>Endogenous (X)</Label>
                        <Select value={xEndogCols[0]} onValueChange={v => setXEndogCols([v])}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h=>h!==yCol).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                        <Label>Exogenous (X)</Label>
                        <Select value={xExogCols[0]} onValueChange={v => setXExogCols([v])}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h=>h!==yCol && !xEndogCols.includes(h)).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                     <div>
                        <Label>Instruments (Z)</Label>
                        <Select value={zCols[0]} onValueChange={v => setZCols([v])}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h=>h!==yCol && !xEndogCols.includes(h) && !xExogCols.includes(h)).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Skeleton className="h-64 w-full" />}
            {analysisResult && (
                <div className="space-y-4">
                    <div className="grid lg:grid-cols-2 gap-4">
                        {analysisResult.ols && renderResultsTable(analysisResult.ols)}
                        {analysisResult.tsls && renderResultsTable(analysisResult.tsls)}
                    </div>
                    
                    {analysisResult.plot && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5" />
                                    Visualization
                                </CardTitle>
                                <CardDescription>
                                    Comparison of OLS and 2SLS coefficients and standard errors
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <img 
                                    src={`data:image/png;base64,${analysisResult.plot}`}
                                    alt="IV Regression Results Visualization"
                                    className="w-full rounded-lg shadow-md"
                                />
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
