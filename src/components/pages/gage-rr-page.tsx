'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sigma, Loader2, HelpCircle, Target, BarChart, Activity, AlertTriangle, Info, BookOpen, ShieldCheck, MoveRight, Settings, FileSearch, CheckCircle } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Skeleton } from '../ui/skeleton';

interface GageRrResults {
    anova_table: Record<string, any>[];
    gage_rr_metrics: Record<string, any>;
    interpretation: string;
}

interface FullAnalysisResponse {
    results: GageRrResults;
}

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const gageExample = exampleDatasets.find(d => d.id === 'gage-rr-data');
    
    return (
        <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-4xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <ShieldCheck className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-3xl">Gage R&R Analysis</CardTitle>
                    <CardDescription className="text-base mt-2">
                        Assess the precision of a measurement system using Repeatability & Reproducibility analysis.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card className="border-2">
                            <CardHeader>
                                <Target className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Repeatability</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Variation from one operator measuring the same part multiple times
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <Activity className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Reproducibility</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Variation from different operators measuring the same part
                                </p>
                            </CardContent>
                        </Card>
                        <Card className="border-2">
                            <CardHeader>
                                <BarChart className="w-6 h-6 text-primary mb-2" />
                                <CardTitle className="text-lg">Part-to-Part</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">
                                    Natural variation between different parts, which should be the main source
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-6">
                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            When to Use Gage R&R
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                           Before you can trust the data from a measurement system, you must verify that the measurement process itself is reliable. 
                           A Gage R&R study determines how much of your process variation is due to the measurement system. 
                           It is essential for any quality improvement project.
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-primary" />
                                    Requirements
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Part:</strong> Identifies each item being measured</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Operator:</strong> Identifies person taking measurement</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>Measurement:</strong> The numeric measurement value</span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                    <FileSearch className="w-4 h-4 text-primary" />
                                    Understanding Results
                                </h4>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>% Contribution:</strong> % of total variation from each source</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>% Study Var:</strong> Gage R&R should be &lt; 30% of total variation</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                        <span><strong>NDC:</strong> Number of distinct categories (&gt;= 5 is good)</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {gageExample && (
                        <div className="flex justify-center pt-2">
                            <Button onClick={() => onLoadExample(gageExample)} size="lg">
                                {gageExample.icon && <gageExample.icon className="mr-2 h-5 w-5" />}
                                Load Example Data
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

interface GageRrPageProps {
    data: DataSet;
    numericHeaders: string[];
    categoricalHeaders: string[];
    allHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function GageRrPage({ data, numericHeaders, categoricalHeaders, allHeaders, onLoadExample }: GageRrPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [partCol, setPartCol] = useState<string | undefined>();
    const [operatorCol, setOperatorCol] = useState<string | undefined>();
    const [measurementCol, setMeasurementCol] = useState<string | undefined>();
    const [isLoading, setIsLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<FullAnalysisResponse | null>(null);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 1 && allHeaders.length >= 3, [data, numericHeaders, allHeaders]);

    useEffect(() => {
        setPartCol(allHeaders.find(h => h.toLowerCase().includes('part')));
        setOperatorCol(allHeaders.find(h => h.toLowerCase().includes('operator')));
        setMeasurementCol(numericHeaders.find(h => h.toLowerCase().includes('measurement')));
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, allHeaders, numericHeaders, canRun]);

    const handleAnalysis = useCallback(async () => {
        if (!partCol || !operatorCol || !measurementCol) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select all three required columns.' });
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);

        try {
            const response = await fetch('/api/analysis/gage-rr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data,
                    part_col: partCol,
                    operator_col: operatorCol,
                    measurement_col: measurementCol,
                })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'API error');
            }

            const result: FullAnalysisResponse = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            setAnalysisResult(result);
            toast({ title: 'Gage R&R Analysis Complete', description: 'Results are now available.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message });
        } finally {
            setIsLoading(false);
        }
    }, [data, partCol, operatorCol, measurementCol, toast]);

    const handleLoadExampleData = () => {
        const gageExample = exampleDatasets.find(ex => ex.id === 'gage-rr-data');
        if (gageExample) {
            onLoadExample(gageExample);
            setPartCol('Part');
            setOperatorCol('Operator');
            setMeasurementCol('Measurement');
            setView('main');
        }
    };
    
    if (view === 'intro' || !canRun) {
        return <IntroPage onStart={() => setView('main')} onLoadExample={handleLoadExampleData} />;
    }

    const results = analysisResult?.results;

    const getInterpretationBadge = (value: number) => {
        if (value < 10) return <Badge className="bg-green-600">Acceptable</Badge>;
        if (value < 30) return <Badge className="bg-yellow-500">Marginal</Badge>;
        return <Badge variant="destructive">Unacceptable</Badge>;
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                     <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Gage R&R Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                    <div><Label>Part Column</Label><Select value={partCol} onValueChange={setPartCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Operator Column</Label><Select value={operatorCol} onValueChange={setOperatorCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{allHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Measurement Column</Label><Select value={measurementCol} onValueChange={setMeasurementCol}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent></Select></div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/>Analyzing...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Skeleton className="h-96 w-full"/>}

            {results && (
                <div className="space-y-4">
                    <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Interpretation</AlertTitle>
                        <AlertDescription dangerouslySetInnerHTML={{ __html: results.interpretation.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                    </Alert>
                    <div className="grid lg:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle>Gage R&R Metrics</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Source of Variation</TableHead>
                                            <TableHead className="text-right">% Contribution</TableHead>
                                            <TableHead className="text-right">% Study Var</TableHead>
                                            <TableHead className="text-right">Interpretation</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(results.gage_rr_metrics).map(([key, value]) => (
                                            <TableRow key={key}>
                                                <TableCell>{key}</TableCell>
                                                <TableCell className="text-right font-mono">{value.contribution?.toFixed(2) || value.value}%</TableCell>
                                                <TableCell className="text-right font-mono">{value.study_var?.toFixed(2)}%</TableCell>
                                                <TableCell className="text-right">{key === 'Total Gage R&R' ? getInterpretationBadge(value.study_var) : '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <p className="text-xs text-muted-foreground mt-2">%Study Var &lt; 10% is good; 10-30% is marginal; &gt; 30% is unacceptable.</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>ANOVA Table</CardTitle></CardHeader>
                            <CardContent>
                                 <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Source</TableHead>
                                            <TableHead>Sum Sq</TableHead>
                                            <TableHead>DF</TableHead>
                                            <TableHead>Mean Sq</TableHead>
                                            <TableHead>F</TableHead>
                                            <TableHead>p-value</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.anova_table.map((row) => (
                                            <TableRow key={row.Source}>
                                                <TableCell>{row.Source}</TableCell>
                                                <TableCell>{row.sum_sq?.toFixed(3)}</TableCell>
                                                <TableCell>{row.df}</TableCell>
                                                <TableCell>{row.MS?.toFixed(3)}</TableCell>
                                                <TableCell>{row.F?.toFixed(3)}</TableCell>
                                                <TableCell>{row['p-value'] < 0.001 ? '&lt;.001' : row['p-value']?.toFixed(4)}</TableCell>
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

