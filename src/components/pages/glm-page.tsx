
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Scaling } from 'lucide-react';
import { exampleDatasets, type ExampleDataSet } from '@/lib/example-datasets';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface GlmResults {
    model_summary_html: string[];
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
    const [targetVar, setTargetVar] = useState<string | undefined>();
    const [features, setFeatures] = useState<string[]>([]);
    
    const [analysisResult, setAnalysisResult] = useState<GlmResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const canRun = useMemo(() => data.length > 0 && allHeaders.length >= 2, [data, allHeaders]);

    const targetOptions = useMemo(() => {
        if (family === 'binomial') return categoricalHeaders;
        return numericHeaders;
    }, [family, numericHeaders, categoricalHeaders]);
    
    const featureOptions = useMemo(() => allHeaders.filter(h => h !== targetVar), [allHeaders, targetVar]);
    
    useEffect(() => {
        const newTarget = targetOptions[0];
        setTargetVar(newTarget);
        setFeatures(allHeaders.filter(h => h !== newTarget));
        setAnalysisResult(null);
    }, [family, data, allHeaders, targetOptions]);

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
                body: JSON.stringify({ data, target_var: targetVar, features, family })
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
    }, [data, targetVar, features, family, toast]);
    
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
                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <Label>Model Family</Label>
                            <Select value={family} onValueChange={setFamily}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gaussian">Gaussian (Linear Regression)</SelectItem>
                                    <SelectItem value="binomial">Binomial (Logistic Regression)</SelectItem>
                                    <SelectItem value="poisson">Poisson (Count Data)</SelectItem>
                                    <SelectItem value="gamma">Gamma (Skewed Continuous Data)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Target Variable</Label>
                            <Select value={targetVar} onValueChange={setTargetVar}>
                                <SelectTrigger><SelectValue placeholder="Select target"/></SelectTrigger>
                                <SelectContent>{targetOptions.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div>
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
                                            <TableCell>{c.variable === 'Intercept' ? 'Intercept' : c.variable.replace('Q("', '').replace('")', '')}</TableCell>
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
                        <CardContent className="space-y-4">
                            {analysisResult.model_summary_html.map((html, index) => (
                                <div key={index} className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: html.replace(/<table/g, '<table class="w-full text-sm"') }} />
                            ))}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
