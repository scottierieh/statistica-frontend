
'use client';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, Play, FileJson, Asterisk, HelpCircle, Award, MoveRight, Building, Hospital, Landmark, GraduationCap, BarChart as BarChartIcon, Image as ImageIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { produce } from 'immer';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, ResponsiveContainer, ScatterChart, Scatter, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import type { DataSet } from '@/lib/stats';
import { Checkbox } from '../ui/checkbox';
import Image from 'next/image';


interface DeaResults {
    efficiency_scores: { [key: string]: number };
    reference_sets: { [key: string]: string[] };
    lambdas: { [key: string]: number[] };
    summary: {
        total_dmus: number;
        efficient_dmus: number;
        inefficient_dmus: number;
        average_efficiency: number;
    };
    dmu_col: string;
    dmu_names: string[];
    interpretation: string;
    input_cols: string[];
    output_cols: string[];
    improvement_potential: {
        dmu: string;
        score: number;
        targets: {
            type: 'input' | 'output';
            name: string;
            actual: number;
            target: number;
            improvement_pct: number;
        }[];
    }[];
}

interface FullDeaResponse {
    results: DeaResults;
    plot?: string;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: () => void }) => {
    const deaExample = exampleDatasets.find(d => d.id === 'dea-bank-data');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <BarChartIcon size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Data Envelopment Analysis (DEA)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-3xl mx-auto">
                        A non-parametric method used to empirically measure the productive efficiency of decision-making units (DMUs).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use DEA?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            When organizations have multiple units (like bank branches, hospitals, or schools) that use various resources (inputs) to produce several outcomes (outputs), comparing their performance can be complex. DEA provides an objective, data-driven way to identify the "best practice" efficiency frontier and measure how far each unit is from this optimal frontier, highlighting specific areas for improvement. It is particularly useful when the relationship between inputs and outputs is complex and not well-understood.
                        </p>
                    </div>
                    <div className="flex justify-center">
                        {deaExample && (
                             <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(deaExample)}>
                                <Landmark className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{deaExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{deaExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl">Setup Guide</h3>
                            <ul className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>DMUs (Decision Making Units):</strong> The entities you are comparing (e.g., 'Branch A', 'Hospital X'). This is a categorical column where each value is unique.</li>
                                <li><strong>Input Variables:</strong> Resources used by the DMU (e.g., 'Number of Employees', 'Operating Cost'). Lower values are generally better.</li>
                                <li><strong>Output Variables:</strong> Products or services produced by the DMU (e.g., 'Loans Issued', 'Patients Treated'). Higher values are generally better.</li>
                                <li><strong>Orientation:</strong> Choose 'Input-oriented' to see how much inputs can be reduced while producing the same output, or 'Output-oriented' to see how much outputs can be increased with the same input.</li>
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl">Result Interpretation</h3>
                            <ul className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Efficiency Score:</strong> A score of 1.0 indicates a DMU is on the efficiency frontier (best practice). A score less than 1.0 indicates relative inefficiency. For an input-oriented model, a score of 0.8 means the DMU could theoretically produce the same output with 20% fewer inputs.</li>
                                <li><strong>Reference Set (Peer Group):</strong> For an inefficient DMU, this shows which efficient DMUs form a "virtual" benchmark. The weights (lambdas) indicate the importance of each peer in forming this benchmark.</li>
                                <li><strong>AI Interpretation:</strong> The AI-powered summary provides actionable insights, identifying top performers and highlighting specific areas for improvement for underperforming units.</li>
                            </ul>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <h3 className="font-semibold text-2xl text-center mb-4">Key Application Areas</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><Landmark className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">Banking</h4><p className="text-xs text-muted-foreground">Evaluating branch efficiency based on staff, costs, deposits, and loans.</p></div></div>
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><Hospital className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">Healthcare</h4><p className="text-xs text-muted-foreground">Assessing hospital performance using beds, staff, patient throughput, and outcomes.</p></div></div>
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><GraduationCap className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">Education</h4><p className="text-xs text-muted-foreground">Comparing schools based on funding, teacher count, test scores, and graduation rates.</p></div></div>
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2"><Building className="mx-auto h-8 w-8 text-primary"/><div><h4 className="font-semibold">Public Sector</h4><p className="text-xs text-muted-foreground">Measuring the efficiency of police departments, libraries, or government agencies.</p></div></div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between p-6 bg-muted/30 rounded-b-lg">
                    <Button variant="outline" onClick={onLoadExample}>Load Bank Branch Example</Button>
                    <Button size="lg" onClick={onStart}>Start New Analysis <MoveRight className="ml-2 w-5 h-5"/></Button>
                </CardFooter>
            </Card>
        </div>
    );
};


interface DeaPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function DeaPage({ data, allHeaders, numericHeaders, onLoadExample }: DeaPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dmuCol, setDmuCol] = useState<string | undefined>();
    const [inputCols, setInputCols] = useState<string[]>([]);
    const [outputCols, setOutputCols] = useState<string[]>([]);
    const [orientation, setOrientation] = useState<'input' | 'output'>('input');
    const [returnsToScale, setReturnsToScale] = useState<'crs' | 'vrs'>('crs');
    
    const [analysisResult, setAnalysisResult] = useState<FullDeaResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 3, [data, allHeaders]);
    
    const availableCols = useMemo(() => numericHeaders.filter(h => h !== dmuCol), [numericHeaders, dmuCol]);
    
    const results = analysisResult?.results;

    const efficiencyTiers = useMemo(() => {
        if (!results) return { efficient: 0, mostly: 0, needs: 0, inefficient: 0 };
        const scores = Object.values(results.efficiency_scores);
        return {
            efficient: scores.filter(s => s >= 1).length,
            mostly: scores.filter(s => s >= 0.9 && s < 1).length,
            needs: scores.filter(s => s >= 0.8 && s < 0.9).length,
            inefficient: scores.filter(s => s < 0.8).length,
        };
    }, [results]);

    const tierData = useMemo(() => [
        { name: 'Efficient (>=1)', count: efficiencyTiers.efficient, fill: 'hsl(var(--chart-2))' },
        { name: 'Mostly (0.9-1)', count: efficiencyTiers.mostly, fill: 'hsl(var(--chart-3))' },
        { name: 'Needs Imp. (0.8-0.9)', count: efficiencyTiers.needs, fill: 'hsl(var(--chart-4))' },
        { name: 'Inefficient (<0.8)', count: efficiencyTiers.inefficient, fill: 'hsl(var(--chart-5))' },
    ], [efficiencyTiers]);

    const tierChartConfig = useMemo(() => ({ 
        count: { label: 'DMUs' }, 
        efficient: { color: 'hsl(var(--chart-2))' }, 
        mostly: { color: 'hsl(var(--chart-3))' }, 
        needs: { color: 'hsl(var(--chart-4))' }, 
        inefficient: { color: 'hsl(var(--chart-5))' }
    }), []);

    const ioChartData = useMemo(() => {
        if (!results || !results.input_cols || !results.output_cols) return [];
        const firstInput = results.input_cols[0];
        const firstOutput = results.output_cols[0];
        if (!firstInput || !firstOutput) return [];
        
        return data.map(row => ({
            name: row[dmuCol!],
            [firstInput]: row[firstInput],
            [firstOutput]: row[firstOutput]
        }));
    }, [results, data, dmuCol]);

    useEffect(() => {
        const potentialDmu = allHeaders.find(h => !numericHeaders.includes(h) && new Set(data.map(row => row[h])).size === data.length);
        setDmuCol(potentialDmu || allHeaders[0]);
    }, [data, allHeaders, numericHeaders]);

    useEffect(() => {
        const remainingCols = numericHeaders.filter(h => h !== dmuCol);
        if (remainingCols.length >= 2) {
            setInputCols([remainingCols[0]]);
            setOutputCols([remainingCols[1]]);
        } else if (remainingCols.length === 1) {
            setInputCols([remainingCols[0]]);
            setOutputCols([]);
        } else {
            setInputCols([]);
            setOutputCols([]);
        }
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [dmuCol, numericHeaders, canRun]);
    
    const handleVarChange = (header: string, checked: boolean, type: 'input' | 'output') => {
        const setCols = type === 'input' ? setInputCols : setOutputCols;
        setCols(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!dmuCol || inputCols.length === 0 || outputCols.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a DMU column, at least one input, and at least one output.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/dea', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    dmu_col: dmuCol,
                    input_cols: inputCols,
                    output_cols: outputCols,
                    orientation,
                    rts: returnsToScale
                })
            });
            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setAnalysisResult(result);
            toast({title: 'DEA Complete', description: 'Efficiency scores have been calculated.'});
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }

    }, [data, dmuCol, inputCols, outputCols, orientation, returnsToScale, toast]);
    
     const handleLoadExampleData = () => {
        const deaExample = exampleDatasets.find(ex => ex.id === 'dea-bank-data');
        if (deaExample) {
            onLoadExample(deaExample);
            setView('main');
        }
    };
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }
    
    if (!canRun) {
        return (
             <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Data Envelopment Analysis (DEA)</CardTitle>
                        <CardDescription>
                           To perform DEA, you need data with inputs, outputs, and decision-making units (DMUs).
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Button onClick={handleLoadExampleData} className="w-full" size="sm">
                           Load Bank Branch Example
                       </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }
    
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">DEA Setup</CardTitle>
                         <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Define your Decision Making Units (DMUs), inputs, and outputs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Decision Making Units (DMU)</Label>
                            <Select value={dmuCol} onValueChange={setDmuCol}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Orientation</Label>
                            <Select value={orientation} onValueChange={(v) => setOrientation(v as any)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="input">Input-Oriented</SelectItem>
                                    <SelectItem value="output">Output-Oriented</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Returns to Scale</Label>
                             <Select value={returnsToScale} onValueChange={(v) => setReturnsToScale(v as any)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="crs">Constant (CRS)</SelectItem>
                                    <SelectItem value="vrs">Variable (VRS)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                     <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Label>Input Variables</Label>
                            <ScrollArea className="h-32 border rounded-md p-2">
                                {availableCols.map(h => (
                                    <div key={`in-${h}`} className="flex items-center space-x-2">
                                        <Checkbox id={`in-${h}`} checked={inputCols.includes(h)} onCheckedChange={(c) => handleVarChange(h, c as boolean, 'input')} />
                                        <Label htmlFor={`in-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                        <div>
                            <Label>Output Variables</Label>
                            <ScrollArea className="h-32 border rounded-md p-2">
                                 {availableCols.map(h => (
                                    <div key={`out-${h}`} className="flex items-center space-x-2">
                                        <Checkbox id={`out-${h}`} checked={outputCols.includes(h)} onCheckedChange={(c) => handleVarChange(h, c as boolean, 'output')} />
                                        <Label htmlFor={`out-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !dmuCol || inputCols.length === 0 || outputCols.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin" /> Running...</> : <><Sigma className="mr-2" />Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary"/> <p>Calculating efficiency scores...</p></CardContent></Card>}

            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">Interpretation</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Alert>
                                <AlertTitle>Analysis Summary</AlertTitle>
                                <AlertDescription className="whitespace-pre-wrap">
                                    {results.interpretation}
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card>
                             <CardHeader>
                                <CardTitle>Efficiency Distribution</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ChartContainer config={tierChartConfig} className="w-full h-64">
                                     <ResponsiveContainer>
                                        <RechartsBarChart data={tierData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis dataKey="name" type="category" width={120} />
                                            <Tooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="count" name="DMUs" radius={4}>
                                                {tierData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </RechartsBarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                         {analysisResult?.plot && (
                            <Card>
                                <CardHeader><CardTitle>Efficiency Frontier</CardTitle></CardHeader>
                                <CardContent>
                                    <Image src={analysisResult.plot} alt="DEA Frontier Plot" width={800} height={600} className="w-full rounded-md border" />
                                </CardContent>
                            </Card>
                        )}
                        {ioChartData.length > 0 && results.input_cols.length > 0 && results.output_cols.length > 0 && (
                             <Card className="lg:col-span-2">
                                <CardHeader><CardTitle>Input/Output Comparison</CardTitle></CardHeader>
                                <CardContent>
                                    <ChartContainer config={{}} className="w-full h-[400px]">
                                        <ResponsiveContainer>
                                            <BarChart data={ioChartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80}/>
                                                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                                                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                                                <Tooltip content={<ChartTooltipContent />} />
                                                <Legend />
                                                <Bar yAxisId="left" dataKey={results.input_cols[0]} fill="#8884d8" name={`Input: ${results.input_cols[0]}`} />
                                                <Bar yAxisId="right" dataKey={results.output_cols[0]} fill="#82ca9d" name={`Output: ${results.output_cols[0]}`} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                    
                    <Card>
                        <CardHeader><CardTitle>Detailed Efficiency Results</CardTitle></CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{results.dmu_col}</TableHead>
                                            <TableHead className="text-right">Efficiency Score</TableHead>
                                            <TableHead>Reference Set (Peer Group)</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.efficiency_scores).sort(([, a], [, b]) => b - a).map(([dmu, score]) => (
                                            <TableRow key={dmu}>
                                                <TableCell>{dmu}</TableCell>
                                                <TableCell className="font-mono text-right">{score.toFixed(4)}</TableCell>
                                                <TableCell>
                                                    {score < 1 && results.reference_sets[dmu] && results.reference_sets[dmu].map((ref, i) => {
                                                      const lambdaVal = results.lambdas[dmu]?.[results.dmu_names.indexOf(ref)];
                                                      return (
                                                        <Badge key={i} variant="secondary" className="mr-1">{ref} {lambdaVal ? `(${(lambdaVal * 100).toFixed(1)}%)` : ''}</Badge>
                                                      )
                                                    })}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Improvement Potential</CardTitle><CardDescription>For inefficient units, this table shows the targets to reach the efficiency frontier.</CardDescription></CardHeader>
                        <CardContent>
                            <ScrollArea className="h-96">
                                {results.improvement_potential.map(item => (
                                    <div key={item.dmu} className="mb-4 p-4 border rounded-md">
                                        <h4 className="font-semibold">{item.dmu} (Score: {item.score.toFixed(3)})</h4>
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Variable</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Target</TableHead><TableHead className="text-right">Improvement</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {item.targets.map(t => (
                                                    <TableRow key={t.name}>
                                                        <TableCell>{t.name}</TableCell>
                                                        <TableCell><Badge variant={t.type === 'input' ? 'destructive' : 'default'}>{t.type}</Badge></TableCell>
                                                        <TableCell className="text-right font-mono">{t.actual.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono">{t.target.toFixed(2)}</TableCell>
                                                        <TableCell className="text-right font-mono text-green-600">{t.improvement_pct > 0 ? `${t.type === 'input' ? '-' : '+'}${t.improvement_pct.toFixed(1)}%` : '-'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ))}
                            </ScrollArea>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Input & Output Data</CardTitle></CardHeader>
                        <CardContent>
                             <ScrollArea className="h-72">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{dmuCol}</TableHead>
                                            {inputCols.map(c => <TableHead key={c} className="text-right">{c} (Input)</TableHead>)}
                                            {outputCols.map(c => <TableHead key={c} className="text-right">{c} (Output)</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.map((row, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{row[dmuCol!]}</TableCell>
                                                {inputCols.map(c => <TableCell key={c} className="text-right font-mono">{row[c]}</TableCell>)}
                                                {outputCols.map(c => <TableCell key={c} className="text-right font-mono">{row[c]}</TableCell>)}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                             </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
