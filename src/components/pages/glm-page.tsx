
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Scaling } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';

interface SummaryTableData {
    caption: string | null;
    data: string[][];
}
interface GlmResults {
    model_summary_data: SummaryTableData[];
    aic: number;
    bic: number;
    log_likelihood: number;
    deviance: number;
    pseudo_r2: number;
    coefficients: {
        variable: string;
        coefficient: number;
        exp_coefficient?: number;
        p_value: number;
        conf_int_lower: number;
        conf_int_upper: number;
        exp_conf_int_lower?: number;
        exp_conf_int_upper?: number;
    }[];
    family: string;
}

const getSignificanceStars = (p: number) => {
    if (p < 0.001) return '***';
    if (p < 0.01) return '**';
    if (p < 0.05) return '*';
    return '';
};


interface GlmPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function GlmPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: GlmPageProps) {
    const { toast } = useToast();
    const [family, setFamily] = useState('gaussian');
    const [linkFunction, setLinkFunction] = useState<string | undefined>();
    const [targetVar, setTargetVar] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<GlmResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);

    const targetOptions = useMemo(() => {
        const binaryCategoricalHeaders = categoricalHeaders.filter(h => {
            const uniqueValues = new Set(data.map(row => row[h]));
            return uniqueValues.size === 2;
        });

        if (family === 'binomial') {
            return [...binaryCategoricalHeaders];
        }
        return numericHeaders;
    }, [family, numericHeaders, categoricalHeaders, data]);
    
    const featureOptions = useMemo(() => allHeaders.filter(h => h !== targetVar), [allHeaders, targetVar]);
    
    useEffect(() => {
        const newTarget = targetOptions[0];
        setTargetVar(newTarget);
        setFeatures(allHeaders.filter(h => h !== newTarget));
        setAnalysisResult(null);
    }, [family, data, allHeaders, targetOptions]);

    const linkFunctionOptions = useMemo(() => {
        switch (family) {
            case 'binomial':
                return ['logit', 'probit', 'cloglog', 'log'];
            case 'gamma':
                return ['log', 'inverse_power'];
            case 'gaussian':
                return ['identity', 'log'];
            default:
                return [];
        }
    }, [family]);
    
     useEffect(() => {
        // Reset link function when family changes if it's not compatible
        if (linkFunctionOptions.length > 0 && !linkFunctionOptions.includes(linkFunction || '')) {
            setLinkFunction(linkFunctionOptions[0]);
        } else if (linkFunctionOptions.length === 0) {
            setLinkFunction(undefined);
        }
    }, [linkFunctionOptions, linkFunction]);


    const handleFeatureChange = (header: string, checked: boolean) => {
        setFeatures(prev => checked ? [...prev, header] : prev.filter(h => h !== header));
    };

    const handleAnalysis = useCallback(async () => {
        if (!targetVar || features.length === 0) {
            toast({ variant: 'destructive', title: 'Selection Error', description: 'Please select a target variable and at least one feature.' });
            return;
        }

        setIsLoading(true);
        setAnalysisResult(null);
        
        try {
            const response = await fetch('/api/analysis/glm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data, target_var: targetVar, features, family, link_function: linkFunction })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
            }
            
            const result: GlmResults = await response.json();
            if ((result as any).error) throw new Error((result as any).error);
            
            setAnalysisResult(result);

        } catch (e: any) {
            console.error('GLM Analysis error:', e);
            toast({ variant: 'destructive', title: 'Analysis Error', description: e.message })
            setAnalysisResult(null);
        } finally {
            setIsLoading(false);
        }
    }, [data, targetVar, features, family, linkFunction, toast]);
    
    const mainSummaryData = useMemo(() => {
        if (!analysisResult?.model_summary_data?.[0]?.data) return [];

        const summaryTable = analysisResult.model_summary_data[0].data;
        const items = [];
        const cleanValue = (val: string) => val.replace(/Q\("([^"]+)"\)/g, '$1');
        
        for (let i = 0; i < summaryTable.length; i++) {
            for (let j = 0; j < summaryTable[i].length; j += 2) {
                const key = summaryTable[i][j].replace(':', '');
                const value = summaryTable[i][j+1];
                if (key && value && key.trim() !== '') {
                    items.push({ key: key.trim(), value: cleanValue(value.trim()) });
                }
            }
        }
        return items;
    }, [analysisResult]);

    if (!canRun) {
        const glmExamples = exampleDatasets.filter(ex => ex.analysisTypes.includes('glm'));
        return (
            <div className="flex flex-1 items-center justify-center">
                <Card className="w-full max-w-2xl text-center">
                    <CardHeader>
                        <CardTitle className="font-headline">Generalized Linear Models (GLM)</CardTitle>
                        <CardDescription>
                           To perform GLM, you need data with at least two variables. Try an example dataset.
                        </CardDescription>
                    </CardHeader>
                     {glmExamples.length > 0 && (
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {glmExamples.map((ex) => (
                                    <Card key={ex.id} className="text-left hover:shadow-md transition-shadow">
                                        <CardHeader className="flex flex-row items-start gap-4 space-y-0 pb-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                                                <Scaling className="h-6 w-6 text-secondary-foreground" />
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
                                ))}
                            </div>
                        </CardContent>
                    )}
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-4">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">GLM Setup</CardTitle>
                    <CardDescription>Select the model family, target variable, and features.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-4 gap-4">
                        <div>
                            <Label>Model Family</Label>
                            <Select value={family} onValueChange={setFamily}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gaussian">Gaussian (Linear)</SelectItem>
                                    <SelectItem value="binomial">Binomial (Logit/Probit)</SelectItem>
                                    <SelectItem value="poisson">Poisson (Count)</SelectItem>
                                    <SelectItem value="gamma">Gamma (Skewed)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         {linkFunctionOptions.length > 0 && (
                            <div>
                                <Label>Link Function</Label>
                                <Select value={linkFunction} onValueChange={setLinkFunction}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {linkFunctionOptions.map(link => <SelectItem key={link} value={link}>{link}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div>
                            <Label>Target Variable</Label>
                            <Select value={targetVar} onValueChange={setTargetVar}>
                                <SelectTrigger><SelectValue placeholder="Select target"/></SelectTrigger>
                                <SelectContent>{targetOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className={linkFunctionOptions.length > 0 ? "" : "md:col-span-2"}>
                             <Label>Features</Label>
                            <ScrollArea className="h-32 border rounded-md p-4">
                                {featureOptions.map(h => (
                                    <div key={h} className="flex items-center space-x-2">
                                        <Checkbox id={`feat-${h}`} checked={features.includes(h)} onCheckedChange={(c) => handleFeatureChange(h, c as boolean)} />
                                        <Label htmlFor={`feat-${h}`}>{h}</Label>
                                    </div>
                                ))}
                            </ScrollArea>
                        </div>
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-end">
                    <Button onClick={handleAnalysis} disabled={isLoading || !targetVar || features.length === 0}>
                        {isLoading ? <><Loader2 className="mr-2 animate-spin"/> Running...</> : <><Sigma className="mr-2"/>Run Analysis</>}
                    </Button>
                </CardFooter>
            </Card>

            {isLoading && <Card><CardContent className="p-6"><Skeleton className="h-96 w-full"/></CardContent></Card>}
            
            {analysisResult && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Model Summary</CardTitle></CardHeader>
                        <CardContent>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">AIC</p><p className="text-2xl font-bold">{analysisResult.aic.toFixed(2)}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">BIC</p><p className="text-2xl font-bold">{analysisResult.bic.toFixed(2)}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Log-Likelihood</p><p className="text-2xl font-bold">{analysisResult.log_likelihood.toFixed(2)}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Pseudo R²</p><p className="text-2xl font-bold">{analysisResult.pseudo_r2.toFixed(4)}</p></div>
                            </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>Coefficients</CardTitle></CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Variable</TableHead>
                                        <TableHead className="text-right">Coefficient</TableHead>
                                        {analysisResult.family !== 'gaussian' && <TableHead className="text-right">Exp(Coef)</TableHead>}
                                        <TableHead className="text-right">p-value</TableHead>
                                        <TableHead className="text-right">95% Confidence Interval</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {analysisResult.coefficients.map(c => (
                                        <TableRow key={c.variable}>
                                            <TableCell>{c.variable.replace(/Q\("([^"]+)"\)/g, '$1')}</TableCell>
                                            <TableCell className="font-mono text-right">{c.coefficient.toFixed(4)}</TableCell>
                                            {analysisResult.family !== 'gaussian' && <TableCell className="font-mono text-right">{c.exp_coefficient?.toFixed(4)}</TableCell>}
                                            <TableCell className="font-mono text-right">{c.p_value < 0.001 ? '<.001' : c.p_value.toFixed(4)} {getSignificanceStars(c.p_value)}</TableCell>
                                            <TableCell className="font-mono text-right">[{c.conf_int_lower.toFixed(3)}, {c.conf_int_upper.toFixed(3)}]</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Full Model Details</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <Card>
                                <CardHeader><CardTitle className="text-base">Model Information</CardTitle></CardHeader>
                                <CardContent>
                                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 text-sm">
                                        {mainSummaryData.map(item => (
                                            <div key={item.key} className="flex justify-between border-b py-1">
                                                <dt className="text-muted-foreground">{item.key}</dt>
                                                <dd className="font-mono">{item.value.replace(/Q\("([^"]+)"\)/g, '$1')}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </CardContent>
                            </Card>
                            {analysisResult.model_summary_data?.[1] && (
                                <Card>
                                     <CardHeader><CardTitle className="text-base">Coefficients (Detailed)</CardTitle></CardHeader>
                                     <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    {analysisResult.model_summary_data[1].data[0].map((header, i) => (
                                                        <TableHead key={i} className={i > 0 ? "text-right" : ""}>{header}</TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {analysisResult.model_summary_data[1].data.slice(1).map((row, i) => (
                                                    <TableRow key={i}>
                                                        {row.map((cell, j) => (
                                                            <TableCell key={j} className={`font-mono ${j > 0 ? "text-right" : ""}`}>
                                                                {cell.replace(/Q\("([^"]+)"\)/g, '$1')}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
