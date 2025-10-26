'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Flame, Star, Target as TargetIcon, TrendingDown, Sparkles, Sigma, HelpCircle, MoveRight, Settings, FileSearch } from 'lucide-react';
import type { DataSet } from '@/lib/stats';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Skeleton } from '../ui/skeleton';

interface IpaMatrixItem {
    attribute: string;
    importance: number;
    performance: number;
    quadrant: string;
    priority_score: number;
    gap: number;
    r_squared?: number;
    relative_importance?: number;
}

interface RegressionSummary {
    r2: number;
    adj_r2: number;
    beta_coefficients: { attribute: string, beta: number }[];
}

interface IpaResults {
    ipa_matrix: IpaMatrixItem[];
    regression_summary: RegressionSummary;
}

interface FullAnalysisResponse {
    results: IpaResults;
    main_plot: string;
    dashboard_plot: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const ipaExample = exampleDatasets.find(d => d.id === 'ipa-restaurant');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                         <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <TargetIcon size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Importance-Performance Analysis (IPA)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        A powerful tool for prioritizing areas for improvement by plotting attributes based on their importance and performance.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use IPA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            IPA helps you make strategic decisions by identifying what truly matters to customers and how well you are delivering on those aspects. By mapping attributes into four quadrants (Keep Up the Good Work, Concentrate Here, Low Priority, Possible Overkill), you can efficiently allocate resources to where they will have the most impact.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {ipaExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(ipaExample)}>
                                <ipaExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{ipaExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{ipaExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Overall Satisfaction:</strong> Select the column representing the overall dependent variable (e.g., 'Overall Satisfaction'). This is used to derive importance.</li>
                                <li><strong>Performance Attributes:</strong> Select the individual attribute columns whose performance you want to measure (e.g., 'Food Quality', 'Service Speed').</li>
                                <li><strong>Run Analysis:</strong> The tool performs regression to determine importance and calculates average performance for each attribute.</li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Concentrate Here:</strong> High Importance, Low Performance. These are your top priorities for improvement.</li>
                                <li><strong>Keep Up the Good Work:</strong> High Importance, High Performance. Maintain your strengths here.</li>
                                <li><strong>Low Priority:</strong> Low Importance, Low Performance. Don't waste resources on these areas.</li>
                                <li><strong>Possible Overkill:</strong> Low Importance, High Performance. You might be investing too much here; consider reallocating resources.</li>
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

interface IpaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function IpaPage({ data, numericHeaders, onLoadExample }: IpaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dependentVar, setDependentVar] = useState<string | undefined>();
    const [independentVars, setIndependentVars] = useState<string[]>([]);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const availableIVs = useMemo(() => numericHeaders.filter(h => h !== dependentVar), [numericHeaders, dependentVar]);
    
    useEffect(() => {
        const overallSat = numericHeaders.find(h => h.toLowerCase().includes('overall'));
        setDependentVar(overallSat || numericHeaders[numericHeaders.length - 1]);
        setView(canRun ? 'main' : 'intro');
    }, [numericHeaders]);

    useEffect(() => {
        setIndependentVars(availableIVs);
        setAnalysisResult(null);
    }, [availableIVs]);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

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
            const response = await fetch('/api/analysis/ipa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependentVar, independentVars })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'API error');
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "IPA results are ready." });

        } catch (e: any) {
            toast({ title: "Analysis Error", description: (e as Error).message, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, independentVars, toast]);

    if (!canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const { results, main_plot, dashboard_plot } = analysisResult || {};

    const quadrantColors = {
        'Q1: Keep Up Good Work': 'bg-green-100 text-green-800',
        'Q2: Concentrate Here': 'bg-red-100 text-red-800',
        'Q3: Low Priority': 'bg-slate-100 text-slate-800',
        'Q4: Possible Overkill': 'bg-amber-100 text-amber-800',
    };
    
    const quadrantIcons = {
        'Q1: Keep Up Good Work': <Star className="w-4 h-4 text-green-600" />,
        'Q2: Concentrate Here': <Flame className="w-4 h-4 text-red-600" />,
        'Q3: Low Priority': <TrendingDown className="w-4 h-4 text-slate-600" />,
        'Q4: Possible Overkill': <Sparkles className="w-4 h-4 text-amber-600" />,
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">IPA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select the dependent and independent variables for the analysis.</CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-4">
                    <div>
                        <Label>Overall Satisfaction (Dependent Var)</Label>
                        <Select value={dependentVar} onValueChange={setDependentVar}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Performance Attributes (Independent Vars)</Label>
                        <ScrollArea className="h-32 border rounded-md p-4">
                            <div className="grid grid-cols-2 gap-2">
                            {availableIVs.map(h => (
                                <div key={h} className="flex items-center space-x-2">
                                    <Checkbox id={`iv-${h}`} checked={independentVars.includes(h)} onCheckedChange={c => handleIVChange(h, c as boolean)} />
                                    <Label htmlFor={`iv-${h}`}>{h}</Label>
                                </div>
                            ))}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="animate-spin mr-2" /> Running...</> : <><Sigma className="mr-2" /> Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Skeleton className="w-full h-96" />}

            {results && (
                <Tabs defaultValue="dashboard">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        <TabsTrigger value="matrix">IPA Matrix & Data</TabsTrigger>
                    </TabsList>
                    <TabsContent value="dashboard" className="mt-4">
                        {dashboard_plot && <Card><CardHeader><CardTitle>Analysis Dashboard</CardTitle></CardHeader><CardContent><Image src={`data:image/png;base64,${dashboard_plot}`} alt="IPA Dashboard" width={1200} height={1200} className="w-full h-auto rounded-md border" /></CardContent></Card>}
                    </TabsContent>
                    <TabsContent value="matrix" className="mt-4">
                         <div className="grid lg:grid-cols-2 gap-6">
                            {main_plot && <Card><CardHeader><CardTitle>IPA Matrix</CardTitle></CardHeader><CardContent><Image src={`data:image/png;base64,${main_plot}`} alt="IPA Matrix" width={1000} height={800} className="w-full h-auto rounded-md border" /></CardContent></Card>}
                             <Card>
                                <CardHeader><CardTitle>IPA Data Table</CardTitle></CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-[500px]">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Attribute</TableHead>
                                                    <TableHead>Quadrant</TableHead>
                                                    <TableHead className="text-right">Performance</TableHead>
                                                    <TableHead className="text-right">Importance</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {results.ipa_matrix.map(item => (
                                                    <TableRow key={item.attribute}>
                                                        <TableCell className="font-medium">{item.attribute}</TableCell>
                                                        <TableCell>
                                                            <Badge className={quadrantColors[item.quadrant as keyof typeof quadrantColors]}>
                                                                {quadrantIcons[item.quadrant as keyof typeof quadrantIcons]}
                                                                <span className="ml-2">{item.quadrant}</span>
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono">{item.performance.toFixed(3)}</TableCell>
                                                        <TableCell className="text-right font-mono">{item.importance.toFixed(3)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
