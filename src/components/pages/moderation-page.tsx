
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Network, CheckCircle, XCircle, HelpCircle, MoveRight, Settings, FileSearch, TrendingUp, AlertTriangle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Label } from '../ui/label';

interface PathResult {
    coefficients: number[];
    p_values: number[];
}

interface SimpleSlope {
    label: string;
    slope: number;
    p_value: number;
}

interface ModerationResults {
    step1: PathResult;
    step2: PathResult;
    r_squared_change: { delta_r2: number; f_change: number; p_change: number };
    simple_slopes: SimpleSlope[];
    interpretation: string;
}

interface FullAnalysisResponse {
    results: ModerationResults;
    plot: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const moderationExample = exampleDatasets.find(d => d.id === 'stress-support');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Network size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Moderation Analysis</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Determine if the relationship between an independent and dependent variable changes depending on the level of a third variable (the moderator).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Moderation Analysis?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Moderation analysis helps answer questions like "When?" or "For whom?" a particular effect occurs. It examines how a moderator variable (M) alters the strength or direction of the relationship between a predictor (X) and an outcome (Y). This is often conceptualized as an "interaction" effect.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {moderationExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(moderationExample)}>
                                <moderationExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{moderationExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{moderationExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Independent Variable (X):</strong> The main predictor variable.</li>
                                <li><strong>Dependent Variable (Y):</strong> The outcome variable.</li>
                                <li><strong>Moderator Variable (M):</strong> The variable that is hypothesized to change the X-Y relationship.</li>
                                <li><strong>Run Analysis:</strong> The tool uses hierarchical regression, first testing the main effects, then adding the interaction term (X * M) to see if it significantly improves the model.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Interaction Term (X*M):</strong> This is the key. A significant p-value for the interaction term (e.g., 'X:M') indicates that moderation is occurring.
                                </li>
                                <li>
                                    <strong>R-squared Change (ΔR²):</strong> Shows how much additional variance in the outcome is explained by adding the interaction term. A significant F-change for this value confirms moderation.
                                </li>
                                <li>
                                    <strong>Simple Slopes Analysis:</strong> If moderation is significant, this analysis breaks down the relationship between X and Y at different levels of the moderator (e.g., low, mean, high), making the interaction easier to understand.
                                </li>
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


interface ModerationPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function ModerationPage({ data, numericHeaders, onLoadExample }: ModerationPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [xVar, setXVar] = useState<string | undefined>();
    const [yVar, setYVar] = useState<string | undefined>();
    const [mVar, setMVar] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 3, [data, numericHeaders]);

    useEffect(() => {
        setXVar(numericHeaders[0] || undefined);
        setMVar(numericHeaders[1] || undefined);
        setYVar(numericHeaders[2] || undefined);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!xVar || !yVar || !mVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select X, Y, and M variables.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/moderation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, xVar, yVar, mVar })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            toast({ title: 'Analysis Complete', description: 'Moderation analysis finished.' });

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, xVar, yVar, mVar, toast]);

    const availableForM = numericHeaders.filter(h => h !== xVar && h !== yVar);
    const availableForY = numericHeaders.filter(h => h !== xVar && h !== mVar);
    
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
                        <CardTitle className="font-headline">Moderation Analysis Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                    <div>
                        <Label>Independent Variable (X)</Label>
                        <Select value={xVar} onValueChange={setXVar}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                        <Label>Moderator Variable (M)</Label>
                        <Select value={mVar} onValueChange={setMVar}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{availableForM.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div>
                        <Label>Dependent Variable (Y)</Label>
                        <Select value={yVar} onValueChange={setYVar}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{availableForY.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !xVar || !yVar || !mVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Skeleton className="h-96 w-full" />}
            
            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Interpretation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Alert variant={results.r_squared_change.p_change < 0.05 ? "default" : "secondary"}>
                                {results.r_squared_change.p_change < 0.05 ? <CheckCircle className="h-4 w-4"/> : <XCircle className="h-4 w-4"/>}
                                <AlertTitle>{results.r_squared_change.p_change < 0.05 ? "Significant Moderation Effect Found" : "No Significant Moderation Effect"}</AlertTitle>
                                <AlertDescription className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                            </Alert>
                        </CardContent>
                    </Card>
                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle>Interaction Plot</CardTitle></CardHeader>
                            <CardContent>
                                {analysisResult?.plot && <Image src={analysisResult.plot} alt="Moderation Plot" width={800} height={600} className="w-full rounded-md border"/>}
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle>Simple Slopes Analysis</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Moderator Level</TableHead><TableHead className="text-right">Slope of X on Y</TableHead><TableHead className="text-right">p-value</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {results.simple_slopes.map(slope => (
                                            <TableRow key={slope.label}>
                                                <TableCell>{slope.label}</TableCell>
                                                <TableCell className="text-right font-mono">{slope.slope.toFixed(4)}</TableCell>
                                                <TableCell className="text-right font-mono">{slope.p_value.toFixed(4)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}

