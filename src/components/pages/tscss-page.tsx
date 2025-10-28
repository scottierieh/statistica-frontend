
'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Users, AlertTriangle, CheckCircle, HelpCircle, MoveRight, Settings, FileSearch, Layers } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';

interface ModelResult {
    name: string;
    params: { [key: string]: number };
    pvalues: { [key: string]: number };
    tstats: { [key: string]: number };
    rsquared: number | null;
    rsquared_within?: number | null;
}

interface FTestResult {
    statistic: number;
    p_value: number;
    interpretation: string;
}

interface HausmanResult {
    statistic: number;
    p_value: number;
    interpretation: string;
    error?: string;
}

interface FullAnalysisResponse {
    results: {
        pooled_ols: ModelResult;
        fixed_effects: ModelResult;
        random_effects: ModelResult;
        f_test_entity: FTestResult;
        hausman_test: HausmanResult;
        interpretation: string;
    };
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const panelExample = exampleDatasets.find(d => d.id === 'panel-data');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Layers size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Panel Data / TSCS Regression</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Analyze datasets that observe multiple entities over multiple time periods, such as countries, firms, or individuals.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use Panel Data Models?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Panel data allows you to control for unobservable variables that differ between entities but are constant over time. This makes it possible to estimate causal effects more reliably than with simple cross-sectional or time-series data alone. This tool provides Pooled OLS, Fixed Effects, and Random Effects models to analyze your panel data.
                        </p>
                    </div>
                    <div className="flex justify-center">
                        {panelExample && (
                             <Card className="p-6 bg-muted/50 rounded-lg space-y-3 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-lg hover:bg-muted/70 transition-all w-full max-w-md" onClick={() => onLoadExample(panelExample)}>
                                <panelExample.icon className="mx-auto h-10 w-10 text-primary"/>
                                <div>
                                    <h4 className="font-semibold text-lg">{panelExample.name}</h4>
                                    <p className="text-sm text-muted-foreground mt-1">{panelExample.description}</p>
                                </div>
                                <Button variant="outline" size="sm" className="mt-2">
                                    Load Example Dataset
                                </Button>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2">
                                <Settings className="text-primary"/> Setup Guide
                            </h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Entity & Time Variables:</strong> Select the columns that identify your unique entities and time periods.</li>
                                <li><strong>Dependent & Independent Variables:</strong> Choose your outcome variable and one or more predictors.</li>
                                <li><strong>Run Analysis:</strong> The tool will automatically run three key models: Pooled OLS, Fixed Effects, and Random Effects.</li>
                            </ol>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2">
                                <FileSearch className="text-primary"/> Model Interpretation
                            </h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li><strong>Fixed Effects (FE):</strong> Controls for all time-invariant differences between entities. Use this when you believe unobserved entity-specific factors are correlated with your predictors.</li>
                                <li><strong>Random Effects (RE):</strong> Assumes unobserved entity-specific factors are random and uncorrelated with predictors. More efficient than FE if its assumptions hold.</li>
                                <li><strong>Hausman Test:</strong> Helps you choose between FE and RE. A significant p-value (&lt; 0.05) suggests using the Fixed Effects model.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end p-6 bg-muted/30 rounded-b-lg">
                    <Button size="lg" onClick={onStart}>
                        Start New Analysis <MoveRight className="ml-2 w-5 h-5"/>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default function TimeSeriesCrossSectionalPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: { data: DataSet; allHeaders: string[]; numericHeaders: string[]; categoricalHeaders: string[]; onLoadExample: (e: any) => void }) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [entityCol, setEntityCol] = useState<string | undefined>();
    const [timeCol, setTimeCol] = useState<string | undefined>();
    const [dependent, setDependent] = useState<string | undefined>();
    const [exog, setExog] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 3, [data, allHeaders]);
    
    const availableFeatures = useMemo(() => allHeaders.filter(h => h !== entityCol && h !== timeCol && h !== dependent), [allHeaders, entityCol, timeCol, dependent]);
    
    const availableTimeCols = useMemo(() => allHeaders.filter(h => h !== entityCol), [allHeaders, entityCol]);

    useEffect(() => {
        if (canRun) {
            const potentialEntity = allHeaders.find(h => !numericHeaders.includes(h) || new Set(data.map(row => row[h])).size > 1);
            setEntityCol(potentialEntity);
            
            const potentialTime = allHeaders.find(h => h.toLowerCase().includes('year') || h.toLowerCase().includes('time')) || allHeaders.find(h => h !== potentialEntity);
            setTimeCol(potentialTime);

            const potentialY = numericHeaders.find(h => h.toLowerCase().includes('gdp') || h.toLowerCase().includes('y'));
            setDependent(potentialY || numericHeaders[0]);
            
            const initialXCols = numericHeaders.filter(h => h !== (potentialY || numericHeaders[0]) && h !== potentialTime && h !== potentialEntity).slice(0, 3);
            setExog(initialXCols);
            setView('main');
        } else {
            setView('intro');
        }
        setAnalysisResult(null);
    }, [canRun, allHeaders, numericHeaders, categoricalHeaders, data]);


    const handleFeatureChange = (header: string, checked: boolean) => {
        setExog(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!entityCol || !timeCol || !dependent || exog.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select all required variables.' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/panel-data-regression', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, entity_col: entityCol, time_col: timeCol, dependent, exog })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'API error');
            }
            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            setAnalysisResult(result);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, entityCol, timeCol, dependent, exog, toast]);

    const handleLoadExampleData = () => {
        const panelExample = exampleDatasets.find(ex => ex.id === 'panel-data');
        if (panelExample) {
            onLoadExample(panelExample);
            setView('main');
        }
    };

    const renderResultsTable = (result: ModelResult) => {
        if (!result) return null;
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{result.name}</CardTitle>
                    <CardDescription>
                         R²: {result.rsquared?.toFixed(4) ?? 'N/A'} {result.rsquared_within && `(Within: ${result.rsquared_within.toFixed(4)})`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader><TableRow><TableHead>Variable</TableHead><TableHead className="text-right">Coefficient</TableHead><TableHead className="text-right">P-value</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {Object.keys(result.params).map(name => (
                                <TableRow key={name}>
                                    <TableCell>{name}</TableCell>
                                    <TableCell className="text-right font-mono">{result.params[name]?.toFixed(4)}</TableCell>
                                    <TableCell className="text-right font-mono">{result.pvalues[name] < 0.001 ? '<.001' : result.pvalues[name]?.toFixed(3) ?? 'N/A'}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        );
    }
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }
    
    const { pooled_ols, fixed_effects, random_effects, f_test_entity, hausman_test, interpretation } = analysisResult?.results || {};

    return (
        <div className="space-y-4">
            <Card>
                 <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Panel Data Regression Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div><Label>Entity</Label><Select value={entityCol} onValueChange={setEntityCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{allHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Time</Label><Select value={timeCol} onValueChange={setTimeCol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{availableTimeCols.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div><Label>Dependent (Y)</Label><Select value={dependent} onValueChange={setDependent}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                        <div>
                            <Label>Independent (X)</Label>
                            <ScrollArea className="h-24 border rounded-md p-2"><div className="space-y-1">{availableFeatures.map(h => (<div key={h} className="flex items-center space-x-2"><Checkbox id={`x-${h}`} checked={exog.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} /><Label htmlFor={`x-${h}`}>{h}</Label></div>))}</div></ScrollArea>
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Skeleton className="h-96 w-full"/>}
            {analysisResult && (
                <div className="space-y-4">
                    {interpretation && (
                        <Card>
                            <CardHeader><CardTitle>AI Interpretation</CardTitle></CardHeader>
                            <CardContent>
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Analysis Summary & Recommendation</AlertTitle>
                                    <AlertDescription className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: interpretation.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                </Alert>
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader><CardTitle className="font-headline">Model Selection Diagnostics</CardTitle></CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-4">
                            {f_test_entity && (
                                <Alert variant={f_test_entity.p_value < 0.05 ? 'default' : 'secondary'}>
                                    <AlertTitle>F-test for Entity Effects</AlertTitle>
                                    <AlertDescription>
                                        {f_test_entity.interpretation} (p={f_test_entity.p_value?.toFixed(4)})
                                    </AlertDescription>
                                </Alert>
                            )}
                             {hausman_test && (
                                <Alert variant={hausman_test?.p_value !== null && hausman_test?.p_value < 0.05 ? 'default' : 'secondary'}>
                                    <AlertTitle>Hausman Test</AlertTitle>
                                    <AlertDescription>
                                        {hausman_test.error ? hausman_test.error : `${hausman_test.interpretation} (p=${hausman_test.p_value?.toFixed(4) ?? 'N/A'})`}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                    
                    <div className="grid lg:grid-cols-3 gap-4">
                        {pooled_ols && renderResultsTable(pooled_ols)}
                        {fixed_effects && renderResultsTable(fixed_effects)}
                        {random_effects && renderResultsTable(random_effects)}
                    </div>
                </div>
            )}
        </div>
    );
}
