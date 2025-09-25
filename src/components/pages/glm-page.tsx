
'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DataSet } from '@/lib/stats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sigma, Loader2, Scaling, HelpCircle, MoveRight, Settings, FileSearch, TrendingUp } from 'lucide-react';
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

const IntroPage = ({ onStart, onLoadExample }: { onStart: () => void, onLoadExample: (e: any) => void }) => {
    const glmExample = exampleDatasets.find(d => d.id === 'admission-data');
    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-muted/20">
            <Card className="w-full max-w-4xl shadow-2xl">
                <CardHeader className="text-center p-8 bg-muted/50 rounded-t-lg">
                    <div className="flex justify-center items-center gap-3 mb-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Scaling size={36} />
                        </div>
                    </div>
                    <CardTitle className="font-headline text-4xl font-bold">Generalized Linear Models (GLM)</CardTitle>
                    <CardDescription className="text-xl pt-2 text-muted-foreground max-w-2xl mx-auto">
                        An advanced and flexible extension of linear regression for modeling various types of outcome data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-10 px-8 py-10">
                    <div className="text-center">
                        <h2 className="text-2xl font-semibold mb-4">Why Use GLMs?</h2>
                        <p className="max-w-3xl mx-auto text-muted-foreground">
                            Generalized Linear Models are a powerful class of statistical models that include and extend standard linear regression. GLMs are flexible and can handle dependent variables with different distributions, such as binary outcomes (yes/no) with Binomial GLMs or count data with Poisson GLMs, by using a 'link function'. This makes them one of the most widely used tools in modern statistics.
                        </p>
                    </div>
                     <div className="flex justify-center">
                        {glmExample && (
                            <Card className="p-4 bg-muted/50 rounded-lg space-y-2 text-center flex flex-col items-center justify-center cursor-pointer hover:shadow-md transition-shadow w-full max-w-sm" onClick={() => onLoadExample(glmExample)}>
                                <glmExample.icon className="mx-auto h-8 w-8 text-primary"/>
                                <div>
                                    <h4 className="font-semibold">{glmExample.name}</h4>
                                    <p className="text-xs text-muted-foreground">{glmExample.description}</p>
                                </div>
                            </Card>
                        )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><Settings className="text-primary"/> Setup Guide</h3>
                            <ol className="list-decimal list-inside space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Model Family:</strong> Choose the distribution that matches your dependent variable (e.g., 'Binomial' for binary outcomes, 'Poisson' for counts, 'Gaussian' for normal data).
                                </li>
                                <li>
                                    <strong>Link Function:</strong> This function links the linear model to the outcome. It's often set automatically based on the family, but can be customized (e.g., 'Logit' for Binomial).
                                </li>
                                <li>
                                    <strong>Target and Features:</strong> Select your dependent variable (target) and one or more independent variables (features).
                                </li>
                                <li>
                                    <strong>Run Analysis:</strong> The tool fits the specified GLM and provides detailed coefficient tables and model fit statistics.
                                </li>
                            </ol>
                        </div>
                         <div className="space-y-6">
                            <h3 className="font-semibold text-2xl flex items-center gap-2"><FileSearch className="text-primary"/> Results Interpretation</h3>
                             <ul className="list-disc pl-5 space-y-4 text-muted-foreground">
                                <li>
                                    <strong>Coefficients:</strong> The interpretation depends on the link function. For a Logit link, the exponentiated coefficient (Exp(Coef)) is the Odds Ratio.
                                </li>
                                <li>
                                    <strong>Pseudo R²:</strong> An equivalent to R-squared for GLMs, indicating the proportion of variance explained by the model.
                                </li>
                                 <li>
                                    <strong>AIC/BIC:</strong> Information criteria used to compare the fit of different models. Lower values are generally better.
                                </li>
                                <li>
                                    <strong>Deviance:</strong> A measure of model fit. A well-fitting model will have a deviance close to its degrees of freedom.
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


interface GlmPageProps {
    data: DataSet;
    allHeaders: string[];
    numericHeaders: string[];
    categoricalHeaders: string[];
    onLoadExample: (example: ExampleDataSet) => void;
}

export default function GlmPage({ data, allHeaders, numericHeaders, categoricalHeaders, onLoadExample }: GlmPageProps) {
    const { toast } = useToast();
    const [view, setView] = useState('intro');
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
        setView(canRun ? 'main' : 'intro');
    }, [family, data, allHeaders, targetOptions, canRun]);

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
                        <CardTitle className="font-headline">GLM Setup</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => setView('intro')}><HelpCircle className="w-5 h-5"/></Button>
                    </div>
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
            
            {results && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle>Model Summary</CardTitle></CardHeader>
                        <CardContent>
                             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">AIC</p><p className="text-2xl font-bold">{results.aic.toFixed(2)}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">BIC</p><p className="text-2xl font-bold">{results.bic.toFixed(2)}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Log-Likelihood</p><p className="text-2xl font-bold">{results.log_likelihood.toFixed(2)}</p></div>
                                <div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">Pseudo R²</p><p className="text-2xl font-bold">{results.pseudo_r2.toFixed(4)}</p></div>
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
                                        {results.family !== 'gaussian' && <TableHead className="text-right">Exp(Coef)</TableHead>}
                                        <TableHead className="text-right">p-value</TableHead>
                                        <TableHead className="text-right">95% Confidence Interval</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.coefficients.map(c => (
                                        <TableRow key={c.variable}>
                                            <TableCell>{c.variable.replace(/Q\("([^"]+)"\)/g, '$1')}</TableCell>
                                            <TableCell className="font-mono text-right">{c.coefficient.toFixed(4)}</TableCell>
                                            {results.family !== 'gaussian' && <TableCell className="font-mono text-right">{c.exp_coefficient?.toFixed(4)}</TableCell>}
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
                            {results.model_summary_data?.[1] && (
                                <Card>
                                     <CardHeader><CardTitle className="text-base">Coefficients (Detailed)</CardTitle></CardHeader>
                                     <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    {results.model_summary_data[1].data[0].map((header, i) => (
                                                        <TableHead key={i} className={i > 0 ? "text-right" : ""}>{header}</TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {results.model_summary_data[1].data.slice(1).map((row, i) => (
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
