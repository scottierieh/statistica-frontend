
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Scaling, Users, HelpCircle, MoveRight, Settings, FileSearch, BarChart } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';

interface SummaryTableData {
    caption: string | null;
    data: string[][];
}
interface MixedModelResults {
    model_summary_data: SummaryTableData[];
    fixed_effects: { [key: string]: number };
    random_effects: { [key: string]: number };
    p_values: { [key: string]: number };
    log_likelihood: number;
    aic: number;
    bic: number;
}

const getSignificanceStars = (p: number | undefined) => {
    if (p === undefined || p === null) return '';
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const mixedModelExample = exampleDatasets.find(d => d.id === 'rm-anova'); // Using repeated measures data as an example
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Scaling size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Mixed Effects Models</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        Analyze data with hierarchical or nested structures, like students within classrooms or repeated measurements on subjects.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use a Mixed Effects Model?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Standard regression models assume that all data points are independent. Mixed models are designed for situations where this assumption is violated, such as when data is grouped or clustered. They account for both **fixed effects** (consistent predictors across the population) and **random effects** (variability between different groups or subjects), leading to more accurate and reliable conclusions for hierarchical data.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {mixedModelExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(mixedModelExample)}>
                                <mixedModelExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{mixedModelExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{mixedModelExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Dependent Variable (Y):</strong> The continuous outcome you are trying to predict.
                                </li>
                                <li>
                                    <strong>Grouping Variable:</strong> The categorical variable that identifies the clusters or groups in your data (e.g., 'Subject ID', 'Class ID').
                                </li>
                                <li>
                                    <strong>Fixed Effects:</strong> The predictor variables whose effects you want to estimate across the entire population.
                                </li>
                                <li>
                                    <strong>Run Analysis:</strong> The tool will fit the model, estimating both fixed effects and the variance of the random effects.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Fixed Effects Coefficients:</strong> Interpret these like standard regression coefficients. They represent the average effect of a predictor across all groups.
                                </li>
                                 <li>
                                    <strong>Random Effects Variance:</strong> The 'Group Var' in the results table shows the variance *between* groups. A larger value indicates more variability from one group to another.
                                </li>
                                <li>
                                    <strong>AIC/BIC:</strong> These are information criteria used for comparing different models. Lower values indicate a better model fit.
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


interface MixedModelPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function MixedModelPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: MixedModelPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
    const [dependentVar, setDependentVar] = useState<string | undefined>();
    const [fixedEffects, setFixedEffects] = useState<string[]>([]);
    const [groupVar, setGroupVar] = useState<string | undefined>();
    
    const [analysisResult, setAnalysisResult] = useState<MixedModelResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && numericHeaders.length >= 2 && categoricalHeaders.length >= 1, [data, numericHeaders, categoricalHeaders]);

    const featureOptions = useMemo(() => numericHeaders.filter(h => h !== dependentVar), [numericHeaders, dependentVar]);
    
    useEffect(() => {
        setDependentVar(numericHeaders[0]);
        setFixedEffects(numericHeaders.slice(1,3));
        setGroupVar(categoricalHeaders[0]);
        setAnalysisResult(null);
        setView(canRun ? 'main' : 'intro');
    }, [data, numericHeaders, categoricalHeaders, canRun]);

    const handleFeatureChange = (header: string, checked: boolean) => {
        setFixedEffects(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!dependentVar || fixedEffects.length === 0 || !groupVar) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a dependent variable, at least one fixed effect, and a group variable.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch('/api/analysis/mixed-model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, dependent_var: dependentVar, fixed_effects: fixedEffects, group_var: groupVar })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result: MixedModelResults = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message })
            setAnalysisResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, dependentVar, fixedEffects, groupVar, toast]);
    
     if (!canRun && view === 'main') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }
    
    if (view === 'intro') {
        return <IntroPage onStart={() => setView('main')} onLoadExample={onLoadExample} />;
    }

    const results = analysisResult;

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle className="font-headline">Mixed Effects Model Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
                    <CardDescription>Select the dependent variable, fixed effects (predictors), and the grouping variable for random effects.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Dependent Variable (Y)</Label>
                            <Select value={dependentVar} onValueChange={setDependentVar}>
                                <SelectTrigger><SelectValue placeholder="Select target"/></SelectTrigger>
                                <SelectContent>{numericHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                             <Label>Grouping Variable</Label>
                            <Select value={groupVar} onValueChange={setGroupVar}>
                                <SelectTrigger><SelectValue placeholder="Select group"/></SelectTrigger>
                                <SelectContent>{categoricalHeaders.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
                             <Label>Fixed Effects (Predictors)</Label>
                            <ScrollArea className="h-32 border rounded-md p-4">
                                {featureOptions.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`feat-${h}`} checked={fixedEffects.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                        <Label htmlFor={`feat-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !dependentVar || fixedEffects.length === 0 || !groupVar}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}
            
            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Model Summary</CardTitle></CardHeader>
                        <CardContent>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">AIC</p><p className="text-2xl font-bold">{results.aic.toFixed(2)}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">BIC</p><p className="text-2xl font-bold">{results.bic.toFixed(2)}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Log-Likelihood</p><p className="text-2xl font-bold">{results.log_likelihood.toFixed(2)}</p></div>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Model Results</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            {results.model_summary_data?.map((table, tableIndex) => (
                                <div key={tableIndex}>
                                <h3 className="font-semibold mb-2">{table.caption}</h3>
                                <Table>
                                    <TableHeader><TableRow>{table.data[0].map((cell, cellIndex) => <TableHead key={cellIndex}>{cell}</TableHead>)}</TableRow></TableHeader>
                                    <TableBody>
                                    {table.data.slice(1).map((row, rowIndex) => (
                                        <TableRow key={rowIndex}>{row.map((cell, cellIndex) => <TableCell key={cellIndex} className="font-mono">{cell}</TableCell>)}</TableRow>
                                    ))}
                                    </TableBody>
                                </Table>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
