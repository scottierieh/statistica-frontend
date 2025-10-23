'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Flame, Star, Target as TargetIcon, TrendingDown, Sparkles, BarChart3, TrendingUp, Award, Info, HelpCircle, MoveRight, Settings, FileSearch, Users, Activity } from 'lucide-react';
import type { DataSet } from '@/lib/stats';
import Image from 'next/image';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Label as RechartsLabel } from 'recharts';
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
    r_squared: number;
    relative_importance: number;
    performance_gap?: number;
    improvement_priority_index?: number; 
    beta?: number;
}

interface RegressionSummary {
    r2: number;
    adj_r2: number;
    beta_coefficients: { attribute: string, beta: number }[];
}

interface IpaResults {
    ipa_matrix: IpaMatrixItem[];
    means: {
        performance: number;
        importance: number;
    };
    regression_summary: RegressionSummary;
}

interface FullAnalysisResponse {
    results: IpaResults;
    main_plot: string;
    dashboard_plot: string;
}

interface IpaPageProps {
    data: DataSet;
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

const quadrantConfig = {
    'Q2: Concentrate Here': { icon: Flame, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", action: "🎯 Urgent Action" },
    'Q1: Keep Up Good Work': { icon: Star, color: "text-green-600", bg: "bg-green-50", border: "border-green-200", action: "✨ Maintain Excellence" },
    'Q3: Low Priority': { icon: TargetIcon, color: "text-gray-600", bg: "bg-gray-50", border: "border-gray-200", action: "📊 Monitor" },
    'Q4: Possible Overkill': { icon: TrendingDown, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", action: "⚖️ Re-allocate Resources" },
};

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const ipaExample = exampleDatasets.find(d => d.id === 'ipa-restaurant');
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Card className="w-full max-w-4xl shadow-lg">
                <CardHeader className="text-center p-8">
                    <CardTitle className="font-headline text-4xl font-bold flex items-center justify-center gap-3">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><TargetIcon size={36} /></div>
                        Importance-Performance Analysis (IPA)
                    </CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground">A strategic tool to prioritize improvement areas by mapping attributes based on their perceived importance and performance.</CardDescription>
                </CardHeader>
                <CardContent className="px-8 py-10 space-y-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use IPA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">IPA helps you identify which features or service aspects to focus on. By plotting attributes on a two-dimensional grid, you can quickly see what's working well, what needs urgent attention, what might be over-resourced, and what is a low priority.</p>
                    </div>
                    {ipaExample && (
                        <div className="flex justify-center">
                             <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(ipaExample)}>
                                <ipaExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div><h4 className="font-semibold">{ipaExample.name}</h4><p className="text-xs text-muted-foreground">{ipaExample.description}</p></div>
                            </Card>
                        </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="font-semibold text-xl mb-4 flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ul className="list-decimal pl-5 space-y-2 text-muted-foreground">
                                <li><strong>Dependent Variable:</strong> The overall outcome measure (e.g., 'Overall Satisfaction').</li>
                                <li><strong>Independent Variables:</strong> The attributes whose performance you measured (e.g., 'Food Quality', 'Service').</li>
                                <li><strong>Run Analysis:</strong> The tool calculates importance (via regression) and performance (mean score) to generate the IPA matrix.</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-xl mb-4 flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                                <li><strong>Keep Up the Good Work:</strong> High importance, high performance. Your strengths.</li>
                                <li><strong>Concentrate Here:</strong> High importance, low performance. Critical weaknesses to fix now.</li>
                                <li><strong>Low Priority:</strong> Low importance, low performance. Don't worry about these for now.</li>
                                <li><strong>Possible Overkill:</strong> Low importance, high performance. You may be investing too many resources here.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="p-6 bg-muted/20 flex justify-end">
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5" /></Button>
                </CardFooter>
            </Card>
        </div>
    );
};


export default function IpaPage({ data, numericHeaders, onLoadExample }: IpaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dependentVar, setDependentVar] = useState<string | undefined>();
    const [independentVars, setIndependentVars] = useState<string[]>([]);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2, [data, numericHeaders]);

    useEffect(() => {
        const overallSat = numericHeaders.find(h => h.toLowerCase().includes('overall'));
        setDependentVar(overallSat || numericHeaders[numericHeaders.length - 1]);
        setIndependentVars(numericHeaders.filter(h => h !== (overallSat || numericHeaders[numericHeaders.length - 1])));
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, canRun]);
    
    const availableIVs = useMemo(() => numericHeaders.filter(h => h !== dependentVar), [numericHeaders, dependentVar]);
    
    useEffect(() => {
        setIndependentVars(prev => prev.filter(v => availableIVs.includes(v)));
    }, [dependentVar, availableIVs]);

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
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            toast({ title: "Analysis Complete", description: "IPA results are ready." });

        } catch (e: any) {
            setError(e.message);
            toast({ title: "Analysis Error", description: e.message, variant: "destructive" });
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

    const { results, main_plot, dashboard_plot } = analysisResult || {};

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">IPA Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
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
                <div className="space-y-6">
                    {main_plot && <Card><CardHeader><CardTitle>IPA Matrix</CardTitle></CardHeader><CardContent><Image src={`data:image/png;base64,${main_plot}`} alt="IPA Matrix" width={1000} height={800} className="w-full h-auto rounded-md border" /></CardContent></Card>}
                    {dashboard_plot && <Card><CardHeader><CardTitle>Analysis Dashboard</CardTitle></CardHeader><CardContent><Image src={`data:image/png;base64,${dashboard_plot}`} alt="IPA Dashboard" width={1800} height={1200} className="w-full h-auto rounded-md border" /></CardContent></Card>}
                </div>
            )}
        </div>
    );
}
