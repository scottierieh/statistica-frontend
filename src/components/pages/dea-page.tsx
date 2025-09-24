
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Binary, HeartPulse, BarChart as BarChartIcon, Bot, HelpCircle, MoveRight } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { ChartContainer, ChartTooltipContent } from '../ui/chart';
import { BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, ResponsiveContainer, ScatterChart, Scatter, Cell } from 'recharts';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';


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
}

interface FullDeaResponse {
    results: DeaResults;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: () => void }) => {
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
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        A performance measurement technique used to evaluate the relative efficiency of Decision-Making Units (DMUs).
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-left space-y-10 px-8 py-10">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                             <h3 className="font-semibold text-2xl">Setup Guide</h3>
                            <ul className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>DMUs:</strong> The entities you are comparing (e.g., 'Branch A', 'Hospital X'). This is a categorical column where each value is unique.</li>
                                <li><strong>Input Variables:</strong> Resources used by the DMU (e.g., 'Employees', 'Operating Cost'). Lower is better.</li>
                                <li><strong>Output Variables:</strong> Products or services produced by the DMU (e.g., 'Loans', 'Deposits'). Higher is better.</li>
                                <li><strong>Orientation:</strong> Choose 'Input-oriented' to see how much inputs can be reduced, or 'Output-oriented' to see how much outputs can be increased.</li>
                            </ul>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl">Result Interpretation</h3>
                            <ul className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li><strong>Efficiency Score:</strong> A score of 1.0 indicates a DMU is fully efficient. A score less than 1.0 indicates relative inefficiency.</li>
                                <li><strong>Reference Set (Peer Group):</strong> For an inefficient DMU, this shows which efficient DMUs it should benchmark against to improve.</li>
                                <li><strong>Interpretation:</strong> The AI-powered summary provides actionable insights, identifying top performers and highlighting areas for improvement for underperforming units.</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between p-6 bg-muted/30 rounded-b-lg">
                     <Button variant="outline" onClick={onLoadExample}>Load Sample Data</Button>
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
        { name: 'Efficient (>=1)', count: efficiencyTiers.efficient, fill: 'var(--color-efficient)' },
        { name: 'Mostly (0.9-1)', count: efficiencyTiers.mostly, fill: 'var(--color-mostly)' },
        { name: 'Needs Imp. (0.8-0.9)', count: efficiencyTiers.needs, fill: 'var(--color-needs)' },
        { name: 'Inefficient (<0.8)', count: efficiencyTiers.inefficient, fill: 'var(--color-inefficient)' },
    ], [efficiencyTiers]);

    const tierChartConfig = useMemo(() => ({ 
        count: { label: 'DMUs' }, 
        efficient: { color: 'hsl(var(--chart-2))' }, 
        mostly: { color: 'hsl(var(--chart-3))' }, 
        needs: { color: 'hsl(var(--chart-4))' }, 
        inefficient: { color: 'hsl(var(--chart-5))' }
    }), []);


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
    }, [dmuCol, numericHeaders]);
    
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

            {isLoading && <Card><CardContent className="p-6 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto"/> <p>Calculating efficiency scores...</p></CardContent></Card>}

            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2"><Bot /> Interpretation</CardTitle>
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

                    <Card>
                        <CardHeader>
                            <CardTitle>DEA Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Total DMUs</p><p className="text-2xl font-bold">{results.summary.total_dmus}</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Efficient DMUs</p><p className="text-2xl font-bold text-green-600">{results.summary.efficient_dmus}</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Inefficient DMUs</p><p className="text-2xl font-bold text-destructive">{results.summary.inefficient_dmus}</p></div>
                            <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Avg. Efficiency</p><p className="text-2xl font-bold">{results.summary.average_efficiency.toFixed(3)}</p></div>
                        </CardContent>
                    </Card>

                    <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle>Efficiency Score Distribution</CardTitle></CardHeader>
                            <CardContent>
                                <ChartContainer config={{}} className="w-full h-[300px]">
                                    <ResponsiveContainer>
                                        <BarChart data={Object.entries(results.efficiency_scores).map(([name, score]) => ({name, score}))}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" tick={false} />
                                            <YAxis domain={[0, 'dataMax + 0.1']} />
                                            <Tooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="score" name="Efficiency Score" fill="hsl(var(--primary))" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>DMU Efficiency Tiers</CardTitle></CardHeader>
                            <CardContent>
                                <ChartContainer config={tierChartConfig} className="w-full h-[300px]">
                                    <ResponsiveContainer>
                                        <BarChart data={tierData} layout="vertical" margin={{left: 120}}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis type="category" dataKey="name" />
                                            <Tooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="count" name="DMUs" radius={4}>
                                                 {tierData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Detailed Efficiency Results</CardTitle>
                        </CardHeader>
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
                </div>
            )}
        </div>
    );
}
