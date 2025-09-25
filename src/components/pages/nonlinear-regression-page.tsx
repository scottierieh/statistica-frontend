
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Atom, AlertTriangle, Settings, FileSearch, MoveRight, HelpCircle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface AnalysisResponse {
    results: {
        parameters: { [key: string]: number };
        standard_errors: { [key: string]: number };
        p_values: { [key: string]: number };
        r_squared: number;
        aic: number | null;
        rss: number | null;
        interpretation: string;
    };
    plot: string;
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const nlRegressionExample = exampleDatasets.find(d => d.id === 'nonlinear-regression');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Atom size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Nonlinear Regression</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Model complex, non-linear relationships between variables that cannot be captured by a straight line.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Nonlinear Regression?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            When the relationship between your predictor and outcome variables follows a curve—such as growth patterns, dose-response relationships, or saturation effects—linear regression is not appropriate. Nonlinear regression fits your data to a predefined function, allowing you to model these complex trends accurately.
                        </p>
                    </div>
                     <div className="flex justify-center">
                           {nlRegressionExample && (
                                <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(nlRegressionExample)}>
                                    <nlRegressionExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                    <div>
                                        <h4 className="font-semibold">{nlRegressionExample.name}</h4>
                                        <p className="text-xs text-muted-foreground">{nlRegressionExample.description}</p>
                                    </div>
                                </Card>
                            )}
                        </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>X Column (Predictor):</strong> Select the numeric independent variable.</li>
                                <li><strong>Y Column (Outcome):</strong> Select the numeric dependent variable you want to predict.</li>
                                <li><strong>Model Type:</strong> Choose a function that best represents the expected relationship (e.g., Exponential for rapid growth, Sigmoid for S-shaped curves).</li>
                                <li><strong>Run Analysis:</strong> The tool will find the best-fit parameters for your chosen model.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>R-squared (R²):</strong> Indicates how well the fitted curve explains the variance in the outcome variable. Closer to 1 is better.</li>
                                <li><strong>Fitted Plot:</strong> The most important output. Visually inspect if the red line (the model) accurately follows the pattern of your data points.</li>
                                <li><strong>Parameters:</strong> These are the coefficients of the chosen nonlinear function (e.g., for `a * exp(b*x)`, 'a' and 'b' are the parameters). A significant p-value suggests the parameter is reliably different from zero.</li>
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


interface NonlinearRegressionPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function NonlinearRegressionPage({ data, numericHeaders, onLoadExample }: NonlinearRegressionPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [xCol, setXCol] = useState<string | undefined>();
    const [yCol, setValueCol] = useState<string | undefined>();
    const [modelType, setModelType] = useState('exponential');
    
    const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);
    
    useEffect(() => {
        setXCol(numericHeaders[0]);
        setValueCol(numericHeaders[1]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!xCol || !yCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select both X and Y columns.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/nonlinear-regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    data, 
                    x_col: xCol, 
                    y_col: yCol, 
                    model_type: modelType
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result: AnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Nonlinear Regression error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, xCol, yCol, modelType, toast]);

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
                        <CardTitle className="font-headline">Nonlinear Regression Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select variables and a model type to fit a nonlinear curve.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>X Column (Predictor)</Label>
                            <Select value={xCol} onValueChange={setXCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Y Column (Outcome)</Label>
                            <Select value={yCol} onValueChange={setValueCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h=>h !== xCol).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                        </div>
                        <div>
                            <Label>Model Type</Label>
                            <Select value={modelType} onValueChange={setModelType}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
                                <SelectItem value="exponential">Exponential (a * e^(b*x))</SelectItem>
                                <SelectItem value="logarithmic">Logarithmic (a + b*ln(x))</SelectItem>
                                <SelectItem value="power">Power (a * x^b)</SelectItem>
                                <SelectItem value="sigmoid">Sigmoid (Logistic)</SelectItem>
                            </SelectContent></Select>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !xCol || !yCol}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}

            {results && analysisResult?.plot && (
                <div className="space-y-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Model Fit & Interpretation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Key Findings</AlertTitle>
                                <AlertDescription>
                                    <p className="whitespace-pre-wrap">{results.interpretation}</p>
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">{modelType.charAt(0).toUpperCase() + modelType.slice(1)} Regression Fit</CardTitle>
                            <CardDescription>
                                R-squared: <Badge>{results.r_squared.toFixed(4)}</Badge> | AIC: <Badge variant="secondary">{results.aic !== null ? results.aic.toFixed(2) : 'N/A'}</Badge> | RSS: <Badge variant="secondary">{results.rss !== null ? results.rss.toFixed(2) : 'N/A'}</Badge>
                            </CardDescription>
                        </CardHeader>
                        <CardContent className='grid md:grid-cols-2 gap-4'>
                            <Image src={analysisResult.plot} alt="Nonlinear Regression Plot" width={800} height={600} className="w-full rounded-md border"/>
                            <div>
                                <h3 className="font-semibold mb-2">Fitted Parameters</h3>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Parameter</TableHead>
                                            <TableHead className="text-right">Estimate</TableHead>
                                            <TableHead className="text-right">Std. Error</TableHead>
                                            <TableHead className="text-right">p-value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.parameters).map(([param, value]) => (
                                            <TableRow key={param}>
                                                <TableCell>{param}</TableCell>
                                                <TableCell className="text-right font-mono">{value.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{results.standard_errors[param]?.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{results.p_values[param] < 0.001 ? '<.001' : results.p_values[param]?.toFixed(4)} {getSignificanceStars(results.p_values[param])}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
