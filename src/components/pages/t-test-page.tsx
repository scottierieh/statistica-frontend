

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, FlaskConical } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type TestType = 'one_sample' | 'independent_samples' | 'paired_samples';

interface Interpretation {
    title: string;
    description: string;
}

interface TTestResults {
    test_type: string;
    significant: boolean;
    p_value: number;
    t_statistic: number;
    degrees_of_freedom: number;
    cohens_d: number;
    mean_diff?: number;
    confidence_interval?: [number, number];
    descriptives: { [key: string]: { n: number; mean: number; std_dev: number } };
    interpretations?: { [key: string]: Interpretation };
}

interface FullAnalysisResponse {
    results: TTestResults;
    plot: string;
}

interface TTestPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
    activeAnalysis: string;
}

export default function TTestPage({ data, numericHeaders, categoricalHeaders, onLoadExample, activeAnalysis }: TTestPageProps) {
    const { toast } = useToast();
    
    const activeTest: TestType = useMemo(() => {
        const test = activeAnalysis.replace('t-test-', '');
        if (test === 'independent') return 'independent_samples';
        if (test === 'paired') return 'paired_samples';
        return 'one_sample';
    }, [activeAnalysis]);
    
    // State for each test
    const [osVar, setOsVar] = useState(numericHeaders[0]);
    const [osTestValue, setOsTestValue] = useState(0);

    const [isGroupVar, setIsGroupVar] = useState(categoricalHeaders[0]);
    const [isDepVar, setIsDepVar] = useState(numericHeaders[0]);
    const [isEqualVar, setIsEqualVar] = useState(true);

    const [psVar1, setPsVar1] = useState(numericHeaders[0]);
    const [psVar2, setPsVar2] = useState(numericHeaders[1]);

    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && numericHeaders.length > 0, [data, numericHeaders]);

    const handleAnalysis = useCallback(async () => {
        let params: any = {};
        let testType: TestType = activeTest;

        switch(activeTest) {
            case 'one_sample':
                if (!osVar) { toast({ variant: "destructive", title: "Please select a variable." }); return; }
                params = { variable: osVar, test_value: osTestValue };
                break;
            case 'independent_samples':
                if (!isDepVar || !isGroupVar) { toast({ variant: "destructive", title: "Please select dependent and group variables." }); return; }
                params = { variable: isDepVar, group_variable: isGroupVar, equal_var: isEqualVar };
                testType = 'independent_samples';
                break;
            case 'paired_samples':
                if (!psVar1 || !psVar2 || psVar1 === psVar2) { toast({ variant: "destructive", title: "Please select two different variables." }); return; }
                params = { variable1: psVar1, variable2: psVar2 };
                testType = 'paired_samples';
                break;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/t-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, testType: testType, params })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'An unknown error occurred');
            }
            
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('Analysis error:', e);
            toast({ variant: "destructive", title: "Analysis Error", description: e.message });
        } finally {
            setIsLoading(false);
        }

    }, [activeTest, data, osVar, osTestValue, isDepVar, isGroupVar, isEqualVar, psVar1, psVar2, toast]);
    
    useEffect(() => {
        setOsVar(numericHeaders[0]);
        setIsGroupVar(categoricalHeaders[0]);
        setIsDepVar(numericHeaders[0]);
        setPsVar1(numericHeaders[0]);
        setPsVar2(numericHeaders[1]);
        setAnalysisResult(null);
    }, [numericHeaders, categoricalHeaders, data]);


    const renderResult = () => {
        if (!analysisResult) return null;
        const { results, plot } = analysisResult;
        return (
            <div className="space-y-4">
                 {plot && (
                    <Card>
                        <CardHeader><CardTitle>Visualization</CardTitle></CardHeader>
                        <CardContent>
                            <Image src={plot} alt={`${results.test_type.replace(/_/g, ' ')} plot`} width={1000} height={800} className="rounded-md border mx-auto" />
                        </CardContent>
                    </Card>
                )}
                 <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">t-Test Results</CardTitle>
                            <CardDescription>
                                The result is {results.significant ? <Badge>significant</Badge> : <Badge variant="secondary">not significant</Badge>} at α=0.05.
                                {results.p_value < 0.001 ? ' (p < .001)' : ` (p = ${results.p_value.toFixed(3)})`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Statistic</TableHead>
                                        <TableHead className="text-right">Value</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>t-statistic</TableCell>
                                        <TableCell className="text-right font-mono">{results.t_statistic.toFixed(3)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Degrees of Freedom</TableCell>
                                        <TableCell className="text-right font-mono">{results.degrees_of_freedom.toFixed(2)}</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell>Cohen's d</TableCell>
                                        <TableCell className="text-right font-mono">{results.cohens_d.toFixed(3)}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Descriptive Statistics</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Group/Variable</TableHead><TableHead className="text-right">N</TableHead><TableHead className="text-right">Mean</TableHead><TableHead className="text-right">Std. Dev.</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {Object.entries(results.descriptives).map(([name, stats]) => (
                                        <TableRow key={name}>
                                            <TableCell>{name}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.n}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.mean.toFixed(3)}</TableCell>
                                            <TableCell className="text-right font-mono">{stats.std_dev.toFixed(3)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                 {results.interpretations && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Statistical Interpretations</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            {Object.values(results.interpretations).map((interp, i) => (
                                <div key={i}>
                                    <h4 className="font-semibold">{interp.title}</h4>
                                    <p className="text-muted-foreground">{interp.description}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}
            </div>
        )
    };
    
    if (!canRun) {
        const ttestExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('t-test'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">t-Tests</CardTitle>
                        <CardDescription>
                           To perform t-tests, please upload data or try an example dataset.
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {ttestExamples.map((ex) => {
                                const Icon = ex.icon;
                                return (
                                <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                            <Icon className="h-6 w-6 text-secondary-foreground" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-semibold">{ex.name}</CardTitle>
                                            <CardDescription className="text-xs">{ex.description}</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardFooter>
                                        <Button onClick={() => onLoadExample(ex)} className="w-full" size="sm">
                                            Load this data
                                        </Button>
                                    </CardFooter>
                                </Card>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const renderSetup = () => {
      switch(activeTest) {
        case 'one_sample':
          return (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Variable</Label><Select value={osVar} onValueChange={setOsVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Test Value (μ₀)</Label><Input type="number" value={osTestValue} onChange={(e) => setOsTestValue(Number(e.target.value))} /></div>
              </div>
            </div>
          );
        case 'independent_samples':
          return (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Dependent Variable</Label><Select value={isDepVar} onValueChange={setIsDepVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Grouping Variable</Label><Select value={isGroupVar} onValueChange={setIsGroupVar}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{categoricalHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="equal-variance-switch" checked={isEqualVar} onCheckedChange={setIsEqualVar} />
                <Label htmlFor="equal-variance-switch">Assume equal variances (Student's t-test)</Label>
              </div>
            </div>
          );
        case 'paired_samples':
          return (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label>Variable 1 (e.g., Pre-test)</Label><Select value={psVar1} onValueChange={setPsVar1}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>Variable 2 (e.g., Post-test)</Label><Select value={psVar2} onValueChange={setPsVar2}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.filter(h => h !== psVar1).map(h=><SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
              </div>
            </div>
          );
        default: return null;
      }
    }
    
    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">{activeTest.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} t-Test</CardTitle>
                    <CardDescription>
                      {
                        activeTest === 'one_sample' ? 'Compares a sample mean to a known value.' :
                        activeTest === 'independent_samples' ? 'Compares the means of two independent groups.' :
                        'Compares the means of two related measurements.'
                      }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {renderSetup()}
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handleAnalysis} disabled={isLoading}>
                      {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                  </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}
            {!isLoading && analysisResult && renderResult()}
            {!isLoading && !analysisResult && <div className="text-center text-muted-foreground py-10"><FlaskConical className="mx-auto h-12 w-12"/><p className="mt-2">Select variables, then click 'Run Analysis'.</p></div>}
        </div>
    );
}

